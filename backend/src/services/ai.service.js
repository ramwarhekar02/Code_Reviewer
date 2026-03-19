const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  systemInstruction: `You are an expert senior coding assistant embedded in an IDE. Be precise, practical, and language-aware. Prioritize correctness, performance, readability, and actionable advice. When asked for JSON, respond with valid JSON only and do not wrap it in markdown fences.`
});

const LANGUAGE_LABELS = {
  javascript: "JavaScript",
  java: "Java",
  python: "Python",
  cpp: "C++"
};

function logServiceError(scope, error, metadata = {}) {
  console.error(`[AI Service] ${new Date().toISOString()} ${scope} failed`);

  if (Object.keys(metadata).length > 0) {
    console.error("Context:", metadata);
  }

  console.error("Message:", error?.message || error);

  if (error?.stack) {
    console.error(error.stack);
  }

  if (error?.status) {
    console.error("Status:", error.status);
  }

  if (error?.response) {
    console.error("Response:", error.response);
  }
}

function getLanguageLabel(language) {
  return LANGUAGE_LABELS[language] || language || "code";
}

function stripCodeFences(value = "") {
  return value.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
}

function safeJsonParse(raw, fallback) {
  try {
    return JSON.parse(stripCodeFences(raw));
  } catch (error) {
    return fallback(raw);
  }
}

async function generateText(prompt) {
  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    logServiceError("generateText", error, {
      hasGeminiKey: Boolean(process.env.GOOGLE_GEMINI_KEY),
      model: "gemini-2.0-flash"
    });
    throw error;
  }
}

async function generateJson(prompt, fallback) {
  const text = await generateText(prompt);
  return safeJsonParse(text, (raw) => fallback(raw, text));
}

function buildSuggestionFallback(raw) {
  return {
    summary: "AI returned an unstructured suggestion response.",
    items: [
      {
        line: null,
        severity: "info",
        type: "suggestion",
        title: "General feedback",
        detail: stripCodeFences(raw),
        suggestion: "Review the note and apply the relevant improvement manually."
      }
    ]
  };
}

function buildReviewFallback(raw, language) {
  return {
    summary: `Structured review for ${getLanguageLabel(language)} could not be parsed.`,
    errors: {
      syntax: [],
      logical: [],
      performance: []
    },
    complexity: {
      time: "Not determined",
      space: "Not determined"
    },
    approach: {
      current: "Needs manual inspection",
      target: "Optimize after reviewing feedback"
    },
    suggestions: [stripCodeFences(raw)],
    improvedCode: ""
  };
}

function buildChatFallback(raw) {
  return {
    answer: stripCodeFences(raw),
    suggestedActions: []
  };
}

async function getSuggestion({ code, language, cursorLine }) {
  const prompt = `Analyze the following ${getLanguageLabel(language)} code and return concise, line-aware IDE suggestions as JSON.

Return exactly this JSON shape:
{
  "summary": "short overall note",
  "items": [
    {
      "line": 1,
      "severity": "info|warning|error",
      "type": "syntax|logic|performance|style|improvement",
      "title": "short title",
      "detail": "what is happening on this line or nearby",
      "suggestion": "clear fix or improvement",
      "replacement": "optional replacement snippet or empty string"
    }
  ]
}

Rules:
- Focus on the current cursor line ${cursorLine || "unknown"} and nearby lines first.
- Return at most 5 items.
- Only mention issues that are reasonably supported by the code.
- If the code is already solid, return helpful improvement ideas instead of inventing errors.

Code:
${code}`;

  try {
    return await generateJson(prompt, (raw) => buildSuggestionFallback(raw));
  } catch (error) {
    logServiceError("getSuggestion", error, {
      language,
      cursorLine,
      codeLength: code?.length || 0
    });
    throw error;
  }
}

async function getReview({ code, language }) {
  const prompt = `Perform a deep review of this ${getLanguageLabel(language)} solution and return valid JSON only.

Required JSON shape:
{
  "summary": "2-3 sentence summary",
  "errors": {
    "syntax": ["..."],
    "logical": ["..."],
    "performance": ["..."]
  },
  "complexity": {
    "time": "e.g. O(n log n)",
    "space": "e.g. O(n)"
  },
  "approach": {
    "current": "Brute Force|Suboptimal|Reasonable|Optimal with explanation",
    "target": "better target approach or confirm optimal"
  },
  "suggestions": ["ordered improvement items"],
  "improvedCode": "full improved code snippet or empty string"
}

Review requirements:
- Be precise and structured.
- Compare brute-force vs optimal thinking when relevant.
- Separate syntax, logical, and performance problems.
- Mention if the current approach is already optimal.
- Only provide improvedCode when a meaningful improvement exists.

Code:
${code}`;

  try {
    return await generateJson(prompt, (raw) => buildReviewFallback(raw, language));
  } catch (error) {
    logServiceError("getReview", error, {
      language,
      codeLength: code?.length || 0
    });
    throw error;
  }
}

async function getChatResponse({ code, language, messages }) {
  const transcript = (messages || [])
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n");

  const prompt = `You are helping inside a coding IDE.
Language: ${getLanguageLabel(language)}
Current code:
${code || "No code provided."}

Conversation:
${transcript}

Return valid JSON with this shape:
{
  "answer": "direct helpful response in markdown",
  "suggestedActions": ["short follow-up ideas"]
}`;

  try {
    return await generateJson(prompt, (raw) => buildChatFallback(raw));
  } catch (error) {
    logServiceError("getChatResponse", error, {
      language,
      codeLength: code?.length || 0,
      messageCount: Array.isArray(messages) ? messages.length : 0
    });
    throw error;
  }
}

module.exports = {
  getSuggestion,
  getReview,
  getChatResponse
};
