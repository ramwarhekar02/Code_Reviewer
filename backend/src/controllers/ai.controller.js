const aiService = require("../services/ai.service");
const { USE_MOCK_MODE } = require("../services/ai.service");

function sanitizeError(error) {
  if (!error) return error;
  
  const sanitized = { ...error };
  const message = String(error?.message || error || "");
  
  // Remove API keys, tokens, and other sensitive data with more aggressive patterns
  sanitized.message = message
    .replace(/sk-[a-zA-Z0-9_\-\.]+/g, "sk-***REDACTED***")  // OpenAI keys (sk-proj-*, sk-*)
    .replace(/Bearer\s+[a-zA-Z0-9_\-\.]+/gi, "Bearer ***REDACTED***")
    .replace(/api[_-]?key[=:]\s*[a-zA-Z0-9_\-\.]+/gi, "api_key=***REDACTED***")
    .replace(/key\s*[=:]\s*[a-zA-Z0-9_\-\.]+/gi, "key=***REDACTED***")
    .replace(/token[=:]\s*[a-zA-Z0-9_\-\.]+/gi, "token=***REDACTED***");
  
  if (error?.stack) {
    sanitized.stack = error.stack
      .replace(/sk-[a-zA-Z0-9_\-\.]+/g, "sk-***REDACTED***")
      .replace(/Bearer\s+[a-zA-Z0-9_\-\.]+/gi, "Bearer ***REDACTED***")
      .replace(/api[_-]?key[=:]\s*[a-zA-Z0-9_\-\.]+/gi, "api_key=***REDACTED***");
  }
  
  return sanitized;
}

function logControllerError(scope, error) {
  console.error(`[AI Controller] ${new Date().toISOString()} ${scope} failed`);
  const sanitized = sanitizeError(error);
  console.error("Message:", sanitized?.message || error);

  if (sanitized?.stack) {
    console.error(sanitized.stack);
  }

  if (error?.response) {
    console.error("Response:", sanitizeError(error.response));
  }
}

function getErrorResponse(error) {
  const sanitized = sanitizeError(error);
  const message = sanitized?.message || "Unknown error";
  const status = error?.status || 500;
  
  // Handle API key errors
  if (status === 401 || message.includes("API key") || message.includes("Incorrect API")) {
    return {
      status: 401,
      error: "API Configuration Error",
      message: "The AI service is not properly configured. Please contact the administrator to set up a valid API key."
    };
  }
  
  // Handle rate limiting
  if (status === 429) {
    return {
      status: 429,
      error: "Rate Limit Exceeded",
      message: "Too many requests. Please wait a moment and try again."
    };
  }
  
  // Handle authentication errors
  if (status === 403) {
    return {
      status: 403,
      error: "Access Denied",
      message: "You don't have permission to access this service."
    };
  }
  
  // Handle server errors from OpenAI
  if (status >= 500) {
    return {
      status: 503,
      error: "AI Service Unavailable",
      message: "The AI service is temporarily unavailable. Please try again later."
    };
  }
  
  // Handle client errors (4xx excluding 401, 403, 429)
  if (status >= 400) {
    return {
      status: status,
      error: "Invalid Request",
      message: "The request could not be processed. Please check your input and try again."
    };
  }
  
  // Default error
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
