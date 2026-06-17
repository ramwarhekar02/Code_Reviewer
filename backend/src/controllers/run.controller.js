const runService = require("../services/runService");
const logger = require("../utils/logger");

const BLOCKLIST = [
  "process.env",
  "require('fs')",
  'require("fs")',
  "import fs",
  "os.environ",
  "open(",
  "subprocess"
];

module.exports.execute = async (req, res) => {
  const { code, language } = req.body;

  if (!code || !code.trim()) {
    return res.status(400).json({ output: "", error: "No code provided." });
  }

  if (code.length > 5000) {
    return res.status(400).json({ output: "", error: "Code exceeds maximum length" });
  }

  for (const pattern of BLOCKLIST) {
    if (code.includes(pattern)) {
      logger.warn("Blocked unsafe code pattern:", pattern);
      return res.status(400).json({ output: "", error: "Potentially unsafe code detected" });
    }
  }

  const supported = ["javascript", "python", "java", "cpp"];
  const lang = language || "javascript";
  if (!supported.includes(lang)) {
    return res.status(400).json({ output: "", error: `Unsupported language: ${lang}` });
  }

  try {
    const result = await runService.runCode({ code: code.trim(), language: lang });
    if (result.error && (result.error.includes("not recognized") || result.error.includes("not found") || result.error.includes("not installed"))) {
      result.hint = `The ${lang} runtime/compiler is not installed on the server. Install it to run ${lang} code.`;
    }
    res.json(result);
  } catch (error) {
    logger.error("runCode error:", error.message);
    res.status(500).json({ output: "", error: error.message || "Execution failed." });
  }
};
