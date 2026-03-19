const aiService = require("../services/ai.service");

function logControllerError(scope, error) {
  console.error(`[AI Controller] ${new Date().toISOString()} ${scope} failed`);
  console.error("Message:", error?.message || error);

  if (error?.stack) {
    console.error(error.stack);
  }

  if (error?.response) {
    console.error("Response:", error.response);
  }
}

function getPayload(req) {
  return {
    code: req.body.code,
    language: req.body.language || "javascript",
    cursorLine: req.body.cursorLine,
    messages: req.body.messages || []
  };
}

function validateChatRequest(req, res) {
  if (!req.body.code && !Array.isArray(req.body.messages)) {
    res.status(400).json({ error: "Code or chat messages are required." });
    return false;
  }

  return true;
}

module.exports.suggest = async (req, res) => {
  if (!req.body.code) {
    return res.status(400).json({ error: "Code is required." });
  }

  try {
    const response = await aiService.getSuggestion(getPayload(req));
    res.json(response);
  } catch (error) {
    logControllerError("suggest", error);
    res.status(500).json({ error: "Unable to generate suggestions right now." });
  }
};

module.exports.review = async (req, res) => {
  if (!req.body.code) {
    return res.status(400).json({ error: "Code is required." });
  }

  try {
    const response = await aiService.getReview(getPayload(req));
    res.json(response);
  } catch (error) {
    logControllerError("review", error);
    res.status(500).json({ error: "Unable to review code right now." });
  }
};

module.exports.chat = async (req, res) => {
  if (!validateChatRequest(req, res)) {
    return;
  }

  try {
    const response = await aiService.getChatResponse(getPayload(req));
    res.json(response);
  } catch (error) {
    logControllerError("chat", error);
    res.status(500).json({ error: "Unable to respond in chat right now." });
  }
};
