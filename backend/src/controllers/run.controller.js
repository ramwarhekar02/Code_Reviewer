const runService = require("../services/runService");

module.exports.execute = async (req, res) => {
  const { code, language } = req.body;

  if (!code || !code.trim()) {
    return res.status(400).json({ output: "", error: "No code provided." });
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
    res.status(500).json({ output: "", error: error.message || "Execution failed." });
  }
};
