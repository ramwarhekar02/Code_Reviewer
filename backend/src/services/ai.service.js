const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const SYSTEM_INSTRUCTION = `You are an expert code reviewer and mentor for beginner developers. Your goal is to help beginners UNDERSTAND and GROW — not just find errors. Talk like a friendly senior developer, be encouraging never discouraging. Explain WHY not just WHAT. Use simple words, no jargon without explanation. NEVER return JSON for reviews. Always return formatted markdown with symbols and boxes exactly as instructed.`;

const MODEL = "gpt-4o-mini";

function isUsingMockMode() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return true;
  if (key.includes("your-api-key") || key.includes("your-actual")) return true;
  if (!key.startsWith("sk-") || key.length < 20) return true;
  return false;
}

const USE_MOCK_MODE = isUsingMockMode();

function getMockSuggestions(code, language) {
  return {
    summary: "Analyze your code to identify improvements.",
    items: []
  };
}

function getMockReview(code, language) {
  return `### QUALITY SCORE
⭐ Overall: 0/10
📊 Readability: 0/10 | ⚡ Performance: 0/10 | 🏗️ Structure: 0/10

⚠️ No API key configured. Please add a valid OPENAI_API_KEY to your .env file to get real reviews.`;
}

function getMockChatResponse(code, language, messages) {
  const lastMessage = messages?.[messages.length - 1]?.content || "";
  let response = "I'm here to help with your code. ";
  if (lastMessage.toLowerCase().includes("error")) {
    response += "To debug errors, check the console logs and ensure your code doesn't have syntax issues.";
  } else if (lastMessage.toLowerCase().includes("how") || lastMessage.toLowerCase().includes("what")) {
    response += "I can help explain code patterns and best practices.";
  } else if (lastMessage.toLowerCase().includes("fix") || lastMessage.toLowerCase().includes("improve")) {
    response += "Consider refactoring your code for better maintainability and performance.";
  } else {
    response += "Feel free to ask questions about your code!";
  }
  return {
    answer: response,
    suggestedActions: [
      "Add error handling",
      "Optimize performance",
      "Improve code readability"
    ]
  };
}

const LANGUAGE_LABELS = {
  javascript: "JavaScript",
  java: "Java",
  python: "Python",
  cpp: "C++"
};

function sanitizeError(error) {
  if (!error) return error;
  const sanitized = { ...error };
  const message = String(error?.message || error || "");
  sanitized.message = message
    .replace(/sk-[a-zA-Z0-9_\-\.]+/g, "sk-***REDACTED***")
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

function logServiceError(scope, error, metadata = {}) {
  console.error(`[AI Service] ${new Date().toISOString()} ${scope} failed`);
  if (Object.keys(metadata).length > 0) {
    console.error("Context:", metadata);
  }
  const sanitized = sanitizeError(error);
  console.error("Message:", sanitized?.message || error);
  if (sanitized?.stack) {
    console.error(sanitized.stack);
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
  const match = value.match(/```(?:\w*)\s*([\s\S]*?)```/);
  if (match) return match[1].trim();
  return value.trim();
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
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_INSTRUCTION },
        { role: "user", content: prompt }
      ]
    });
    return completion.choices[0].message.content;
  } catch (error) {
    logServiceError("generateText", error, {
      hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
      model: MODEL
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

function buildChatFallback(raw) {
  return {
    answer: stripCodeFences(raw),
    suggestedActions: []
  };
}

async function getSuggestion({ code, language, cursorLine }) {
  if (USE_MOCK_MODE) {
    return getMockSuggestions(code, language);
  }

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
- If the code is only placeholder text, comments, or has no real logic, return empty items and a summary saying "No real code to analyze yet."

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
  if (USE_MOCK_MODE) {
    return getMockReview(code, language);
  }

  const prompt = `Review this ${getLanguageLabel(language)} code written by a beginner developer.
DO NOT return JSON. Return formatted text exactly in this structure:

### QUALITY SCORE
⭐ Overall: X/10
📊 Readability: X/10 | ⚡ Performance: X/10 | 🏗️ Structure: X/10

[If overall score is 7 or above — give max 2 light suggestions and stop. Keep it short and positive.]

---

### INLINE CODE
Return the COMPLETE code with inline comments added on the SAME LINE as the code.
Wrap the code in a fenced code block with the language name (e.g. \`\`\`javascript).
Never put comments on a separate line.
ONLY annotate lines that have a genuine issue or notable pattern. Do NOT add ✅ to every line — most lines should have no comment at all.

Use ONLY these symbols when annotating:
✅ = genuinely good pattern worth highlighting (use sparingly, max 2-3 total)
⚠️ = should fix (actual issue)
❌ = must fix (real bug or serious problem)
💡 = can improve (worth mentioning improvement)
🔵 = beginner tip (one quick tip, max 1)

Example of correct sparse format:
\`\`\`javascript
const x = 5;
var y = 10;               // ⚠️ Avoid var, use let or const instead
function add(a,b){
  return a+b
}
\`\`\`

---

### APPROACH
🧩 [Approach Name] — [max 1 line simple explanation a beginner understands]

---

### COMPLEXITY
⏱️ Time:  O(?) — [simple human explanation in brackets]
💾 Space: O(?) — [simple human explanation in brackets]

---

### SUGGESTIONS
Suggestion count depends on code size:
- ≤10 lines → max 1 suggestion
- 11-20 lines → max 2 suggestions
- 21+ lines → max 3 suggestions (4 only if high-impact)
If score 7+ → reduce by half.

┌─────────────────────────────────────────┐
│ 💡 #1 — [Short Title]                   │
│ Impact: 🔴 High / 🟡 Medium / 🟢 Low   │
│ Type: Performance / Readability /        │
│       Best Practice / Security           │
│                                          │
│ ❌ Current:                              │
│ [paste current code here]                │
│                                          │
│ ✅ Better:                               │
│ [paste improved code here]               │
│                                          │
│ 📖 Why: [max 1.5 lines simple reason]   │
└─────────────────────────────────────────┘

---

### KEY LINES
🔍 Max 3 most important lines:
→ Line X: [paste the exact line]
   └─ [one line why this line matters to a beginner]

---

### WHAT YOU DID WELL
✅ [point 1 — something genuinely good]
✅ [point 2 — something genuinely good]
✅ [point 3 if applicable]

---

### NEXT STEP
🎓 Learn [concept name] — [one line why it will help you grow]

STRICT RULES:
- Never write long paragraphs anywhere
- Inline comments MUST be on the SAME LINE as code — but leave most lines uncommented
- Always show ❌ Current and ✅ Better in every suggestion
- Never skip QUALITY SCORE or COMPLEXITY
- Max 1.5 lines explanation anywhere
- Score 7+ → short and positive only
- Always write WHAT YOU DID WELL
- Use symbols everywhere

Code to review:
${code}`;

  try {
    return await generateText(prompt);
  } catch (error) {
    logServiceError("getReview", error, {
      language,
      codeLength: code?.length || 0
    });
    throw error;
  }
}

async function getChatResponse({ code, language, messages }) {
  if (USE_MOCK_MODE) {
    return getMockChatResponse(code, language, messages);
  }

  const transcript = (messages || [])
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n");

  const prompt = `You are a strict code-assistant inside a coding IDE. You ONLY answer questions related to the user's code, programming, or computer science.

Language: ${getLanguageLabel(language)}
Current code:
${code || "No code provided."}

Conversation:
${transcript}

Rules:
- If the user asks about ANYTHING not related to code, programming, or computer science (e.g. weather, sports, news, general chat), respond with: "Sorry, I can't answer that. Please ask a question related to your code."
- Keep all responses under 3 sentences unless the user asks for details.
- Be direct and helpful. No fluff.

Return valid JSON with this shape:
{
  "answer": "short helpful response in markdown",
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
  getChatResponse,
  USE_MOCK_MODE
};
