const aiService = require("../services/ai.service");
const { USE_MOCK_MODE } = require("../services/ai.service");
const logger = require("../utils/logger");

function logControllerError(scope, error) {
  logger.error(`[AI Controller] ${scope} failed:`, error.message, {
    status: error?.status,
    stack: error?.stack
  });
}

function getErrorResponse(error) {
  const message = error?.message || "Unknown error";
  const status = error?.status || 500;

  if (status === 401 || message.includes("API key") || message.includes("Incorrect API")) {
    return {
      status: 401,
      error: "API Configuration Error",
      message: "The AI service is not properly configured. Please contact the administrator to set up a valid API key."
    };
  }

  if (status === 429) {
    return {
      status: 429,
      error: "Rate Limit Exceeded",
      message: "Too many requests. Please wait a moment and try again."
    };
  }

  if (status === 403) {
    return {
      status: 403,
      error: "Access Denied",
      message: "You don't have permission to access this service."
    };
  }

  if (status >= 500) {
    return {
      status: 503,
      error: "AI Service Unavailable",
      message: "The AI service is temporarily unavailable. Please try again later."
    };
  }

  if (status >= 400) {
    return {
      status,
      error: "Invalid Request",
      message: "The request could not be processed. Please check your input and try again."
    };
  }

  return {
    status: status || 500,
    error: "Processing Error",
    message: "Unable to process your request. Please try again."
  };
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

  if (USE_MOCK_MODE) {
    return res.status(401).json({
      error: "API Configuration Error",
      message: "No API key found. Please contact administrator to set up a valid API key."
    });
  }

  try {
    const response = await aiService.getSuggestion(getPayload(req));
    res.json(response);
  } catch (error) {
    logControllerError("suggest", error);
    const errorResponse = getErrorResponse(error);
    res.status(errorResponse.status).json({
      error: errorResponse.error,
      message: errorResponse.message
    });
  }
};

module.exports.review = async (req, res) => {
  if (!req.body.code) {
    return res.status(400).json({ error: "Code is required." });
  }

  if (USE_MOCK_MODE) {
    return res.status(401).json({
      error: "API Configuration Error",
      message: "No API key found. Please contact administrator to set up a valid API key."
    });
  }

  try {
    const response = await aiService.getReview(getPayload(req));
    res.json(response);
  } catch (error) {
    logControllerError("review", error);
    const errorResponse = getErrorResponse(error);
    res.status(errorResponse.status).json({
      error: errorResponse.error,
      message: errorResponse.message
    });
  }
};

module.exports.extractCode = async (req, res) => {
  if (!req.body.text) {
    return res.status(400).json({ error: "Extracted text is required." });
  }

  if (USE_MOCK_MODE) {
    return res.status(401).json({
      error: "API Configuration Error",
      message: "No API key found. Please contact administrator to set up a valid API key."
    });
  }

  try {
    const response = await aiService.validateExtractedCode({ text: req.body.text });
    res.json(response);
  } catch (error) {
    logControllerError("extractCode", error);
    const errorResponse = getErrorResponse(error);
    res.status(errorResponse.status).json({
      error: errorResponse.error,
      message: errorResponse.message
    });
  }
};

module.exports.extractVision = async (req, res) => {
  if (!req.body.image) {
    return res.status(400).json({ error: "Image data is required." });
  }

  if (USE_MOCK_MODE) {
    return res.status(401).json({
      error: "API Configuration Error",
      message: "No API key found. Please contact administrator to set up a valid API key."
    });
  }

  try {
    const response = await aiService.extractCodeWithVision({ image: req.body.image });
    res.json(response);
  } catch (error) {
    logControllerError("extractVision", error);
    const errorResponse = getErrorResponse(error);
    res.status(errorResponse.status).json({
      error: errorResponse.error,
      message: errorResponse.message
    });
  }
};

module.exports.chat = async (req, res) => {
  if (!validateChatRequest(req, res)) {
    return;
  }

  if (USE_MOCK_MODE) {
    return res.status(401).json({
      error: "API Configuration Error",
      message: "No API key found. Please contact administrator to set up a valid API key."
    });
  }

  try {
    const response = await aiService.getChatResponse(getPayload(req));
    res.json(response);
  } catch (error) {
    logControllerError("chat", error);
    const errorResponse = getErrorResponse(error);
    res.status(errorResponse.status).json({
      error: errorResponse.error,
      message: errorResponse.message
    });
  }
};
