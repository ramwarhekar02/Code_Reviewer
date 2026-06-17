const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const TIMEOUT_MS = 5000;
const MAX_OUTPUT = 10240;

const SPAWN_OPTIONS = {
  timeout: TIMEOUT_MS,
  maxBuffer: MAX_OUTPUT,
  env: {},
  ...(process.platform === "linux" ? { uid: 65534, gid: 65534 } : {})
};

const RUNNERS = {
  javascript: {
    extension: "js",
    setup: null,
    run: (file) => `node "${file}"`,
    cleanup: (file) => [file]
  },
  python: {
    extension: "py",
    setup: null,
    run: (file) => {
      const pythonCmd = process.platform === "win32" ? "python" : "python3";
      return `"${pythonCmd}" "${file}"`;
    },
    cleanup: (file) => [file]
  },
  java: {
    extension: "java",
    setup: (file) => `javac "${file}"`,
    run: (dir, className) => {
      return `java -cp "${dir}" ${className}`;
    },
    getClassName: (code) => {
      const m = code.match(/public\s+(?:class|interface|enum)\s+(\w+)/);
      return m ? m[1] : "Main";
    },
    cleanup: (dir, className) => {
      try {
        const files = fs.readdirSync(dir);
        return files.filter(f => f.endsWith(".java") || f.endsWith(".class")).map(f => path.join(dir, f));
      } catch { return [dir]; }
    }
  },
  cpp: {
    extension: "cpp",
    setup: (file, dir) => `g++ "${file}" -o "${path.join(dir, "a.out")}" -std=c++11`,
    run: (dir) => `"${path.join(dir, "a.out")}"`,
    cleanup: (dir) => {
      try {
        const files = fs.readdirSync(dir);
        return files.filter(f => f.endsWith(".cpp") || f === "a.out" || f.endsWith(".exe")).map(f => path.join(dir, f));
      } catch { return [dir]; }
    }
  }
};

function randomId() {
  return Math.random().toString(36).slice(2, 8);
}

function execPromise(cmd, cwd) {
  return new Promise((resolve) => {
    exec(cmd, { ...SPAWN_OPTIONS, cwd }, (err, stdout, stderr) => {
      resolve({ stdout, stderr, error: err });
    });
  });
}

function deleteFiles(files) {
  for (const f of files) {
    try { fs.unlinkSync(f); } catch {}
  }
}

function prepareJavaCode(code) {
  if (/^\s*(public\s+)?(class|interface|enum)\s+\w+/m.test(code)) {
    const className = code.match(/(?:public\s+)?(?:class|interface|enum)\s+(\w+)/)[1];
    const hasImports = /^import\s/.test(code);
    return { code: hasImports ? code : `import java.util.*;\n${code}`, className };
  }

  const trimmed = code.trim();

  if (/^\s*(public|private|protected|static|\w+\s+\w+\s*\()/m.test(trimmed)) {
    return { code: `import java.util.*;\npublic class Main {\n${trimmed}\n}`, className: "Main" };
  }

  const indent = (s) => s.replace(/\n/g, "\n    ");
  const hasReturn = /\breturn\s+\S/.test(trimmed);

  if (hasReturn) {
    return {
      code: `import java.util.*;\npublic class Main {\n  public static Object run() {\n    ${indent(trimmed)}\n  }\n\n  public static void main(String[] args) {\n    Object result = run();\n    if (result != null) {\n      Class<?> c = result.getClass();\n      if (c.isArray()) {\n        if (result instanceof int[]) System.out.println(Arrays.toString((int[]) result));\n        else if (result instanceof long[]) System.out.println(Arrays.toString((long[]) result));\n        else if (result instanceof double[]) System.out.println(Arrays.toString((double[]) result));\n        else if (result instanceof char[]) System.out.println(Arrays.toString((char[]) result));\n        else System.out.println(Arrays.toString((Object[]) result));\n      } else {\n        System.out.println(result);\n      }\n    }\n  }\n}`,
      className: "Main"
    };
  }

  return {
    code: `public class Main {\n  public static void main(String[] args) {\n    ${indent(trimmed)}\n  }\n}`,
    className: "Main"
  };
}

function prepareCppCode(code) {
  if (/\bint\s+main\s*\(/.test(code)) {
    return code;
  }
  const trimmed = code.trim();
  if (/^\s*(for|while|if|switch|try|catch|return|cout|cin|int\s|string\s|double\s|float\s|char\s|bool\s|auto\s|vector\s|map\s)/m.test(trimmed)) {
    const hasInclude = /#include/.test(code);
    const includes = hasInclude ? "" : '#include <iostream>\nusing namespace std;\n';
    return `${includes}int main() {\n  ${trimmed.replace(/\n/g, "\n  ")}\n  return 0;\n}`;
  }
  return code;
}

async function runCode({ code, language }) {
  const runner = RUNNERS[language];
  if (!runner) {
    return { output: "", error: `Unsupported language: ${language}` };
  }

  const id = randomId();
  const tmpDir = path.join(os.tmpdir(), `cr_${id}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    if (language === "java") {
      const { code: preparedCode, className } = prepareJavaCode(code);
      const filePath = path.join(tmpDir, `${className}.java`);
      fs.writeFileSync(filePath, preparedCode);

      const { stdout: compOut, stderr: compErr, error: compErrObj } = await execPromise(runner.setup(filePath), tmpDir);
      if (compErrObj) {
        return { output: "", error: (compErr || compOut || compErrObj.message).trim() };
      }

      const { stdout, stderr, error } = await execPromise(runner.run(tmpDir, className), tmpDir);
      return { output: stdout.trim(), error: (stderr || (error ? error.message : "")).trim() };
    }

    if (language === "cpp") {
      const preparedCode = prepareCppCode(code);
      const filePath = path.join(tmpDir, `code.${runner.extension}`);
      fs.writeFileSync(filePath, preparedCode);

      const { stdout: compOut, stderr: compErr, error: compErrObj } = await execPromise(runner.setup(filePath, tmpDir), tmpDir);
      if (compErrObj) {
        return { output: "", error: (compErr || compOut || compErrObj.message).trim() };
      }

      const { stdout, stderr, error } = await execPromise(runner.run(tmpDir), tmpDir);
      return { output: stdout.trim(), error: (stderr || (error ? error.message : "")).trim() };
    }

    const filePath = path.join(tmpDir, `code.${runner.extension}`);
    fs.writeFileSync(filePath, code);

    const { stdout, stderr, error } = await execPromise(runner.run(filePath), tmpDir);
    return { output: stdout.trim(), error: (stderr || (error ? error.message : "")).trim() };
  } finally {
    const cleanupFiles = runner.cleanup ? runner.cleanup(tmpDir) : [tmpDir];
    deleteFiles(cleanupFiles);
    try { fs.rmdirSync(tmpDir); } catch {}
  }
}

module.exports = { runCode };
