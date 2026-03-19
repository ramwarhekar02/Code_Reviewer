import { useEffect, useRef, useState } from "react";
import axios from "axios";
import Editor from "@monaco-editor/react";
import Markdown from "react-markdown";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://code-reviewer-57sc.onrender.com";

const LANGUAGE_OPTIONS = [
  { value: "javascript", label: "JavaScript", monaco: "javascript" },
  { value: "java", label: "Java", monaco: "java" },
  { value: "python", label: "Python", monaco: "python" },
  { value: "cpp", label: "C++", monaco: "cpp" }
];

const STARTER_SNIPPETS = {
  javascript: `function twoSum(nums, target) {
  const seen = new Map();

  for (let index = 0; index < nums.length; index += 1) {
    const complement = target - nums[index];

    if (seen.has(complement)) {
      return [seen.get(complement), index];
    }

    seen.set(nums[index], index);
  }

  return [];
}`,
  java: `import java.util.HashMap;
import java.util.Map;

class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> seen = new HashMap<>();

        for (int index = 0; index < nums.length; index++) {
            int complement = target - nums[index];

            if (seen.containsKey(complement)) {
                return new int[]{seen.get(complement), index};
            }

            seen.put(nums[index], index);
        }

        return new int[]{};
    }
}`,
  python: `def two_sum(nums, target):
    seen = {}

    for index, value in enumerate(nums):
        complement = target - value
        if complement in seen:
            return [seen[complement], index]

        seen[value] = index

    return []`,
  cpp: `#include <unordered_map>
#include <vector>
using namespace std;

vector<int> twoSum(vector<int>& nums, int target) {
    unordered_map<int, int> seen;

    for (int index = 0; index < nums.size(); index++) {
        int complement = target - nums[index];

        if (seen.count(complement)) {
            return {seen[complement], index};
        }

        seen[nums[index]] = index;
    }

    return {};
}`
};

const INITIAL_CHAT = [
  {
    role: "assistant",
    content: "Ask for an optimization, explanation, conversion, or debugging help. I will use the current code and selected language as context."
  }
];

const INITIAL_REVIEW_MARKDOWN = [
  "## AI Review",
  "",
  "Click **Review Code** to generate a readable analysis with summary, errors, complexity, and improvement suggestions."
].join("\n");

function getLanguageMeta(language) {
  return LANGUAGE_OPTIONS.find((option) => option.value === language) || LANGUAGE_OPTIONS[0];
}

function severityClass(severity) {
  if (severity === "error") {
    return "severity-error";
  }

  if (severity === "warning") {
    return "severity-warning";
  }

  return "severity-info";
}

function asList(items, fallback) {
  if (!Array.isArray(items) || items.length === 0) {
    return [`- ${fallback}`];
  }

  return items.map((item) => `- ${item}`);
}

function formatReviewResponse(review) {
  const sections = [
    "## Summary",
    review.summary || "No summary was returned.",
    "",
    "## Errors",
    "### Syntax Errors",
    ...asList(review.errors?.syntax, "No syntax issues were highlighted."),
    "",
    "### Logical Errors",
    ...asList(review.errors?.logical, "No logical issues were highlighted."),
    "",
    "### Performance Errors",
    ...asList(review.errors?.performance, "No performance issues were highlighted."),
    "",
    "## Complexity",
    `- Time Complexity: ${review.complexity?.time || "Not provided"}`,
    `- Space Complexity: ${review.complexity?.space || "Not provided"}`,
    "",
    "## Approach",
    `- Current: ${review.approach?.current || "Not provided"}`,
    `- Better Option: ${review.approach?.target || "Not provided"}`,
    "",
    "## Suggestions",
    ...asList(review.suggestions, "No improvement suggestions were returned.")
  ];

  if (review.improvedCode) {
    sections.push("", "## Improved Code", "```", review.improvedCode, "```");
  }

  return sections.join("\n");
}

function App() {
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState(STARTER_SNIPPETS.javascript);
  const [suggestionsEnabled, setSuggestionsEnabled] = useState(true);
  const [theme, setTheme] = useState("dark");
  const [activePanel, setActivePanel] = useState("suggestions");
  const [cursorPosition, setCursorPosition] = useState({ lineNumber: 1, column: 1 });
  const [suggestionsData, setSuggestionsData] = useState({
    summary: "Live suggestions will appear here as you type.",
    items: []
  });
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [reviewMarkdown, setReviewMarkdown] = useState(INITIAL_REVIEW_MARKDOWN);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [chatMessages, setChatMessages] = useState(INITIAL_CHAT);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef([]);
  const suggestionRequestRef = useRef(0);
  const chatScrollerRef = useRef(null);

  const languageMeta = getLanguageMeta(language);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (!suggestionsEnabled) {
      setSuggestionsLoading(false);
      setSuggestionsData({
        summary: "Live AI suggestions are paused. Turn them back on anytime.",
        items: []
      });
      return undefined;
    }

    if (!code.trim()) {
      setSuggestionsData({ summary: "Add some code to start receiving suggestions.", items: [] });
      return undefined;
    }

    const requestId = suggestionRequestRef.current + 1;
    suggestionRequestRef.current = requestId;

    const timer = window.setTimeout(async () => {
      setSuggestionsLoading(true);

      try {
        const response = await axios.post(`${API_BASE_URL}/ai/suggest`, {
          code,
          language,
          cursorLine: cursorPosition.lineNumber
        });

        if (suggestionRequestRef.current === requestId) {
          setSuggestionsData({
            summary: response.data.summary || "Suggestions updated.",
            items: Array.isArray(response.data.items) ? response.data.items : []
          });
        }
      } catch (error) {
        if (suggestionRequestRef.current === requestId) {
          setSuggestionsData({
            summary: "Suggestion service is temporarily unavailable.",
            items: []
          });
        }
      } finally {
        if (suggestionRequestRef.current === requestId) {
          setSuggestionsLoading(false);
        }
      }
    }, 700);

    return () => window.clearTimeout(timer);
  }, [code, language, cursorPosition.lineNumber, suggestionsEnabled]);

  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) {
      return;
    }

    const nextDecorations = suggestionsData.items
      .filter((item) => Number.isInteger(item.line) && item.line > 0)
      .map((item) => ({
        range: new monacoRef.current.Range(item.line, 1, item.line, 1),
        options: {
          isWholeLine: true,
          className: `editor-line-highlight ${severityClass(item.severity)}`,
          glyphMarginClassName: `editor-glyph ${severityClass(item.severity)}`,
          glyphMarginHoverMessage: { value: item.title || item.suggestion || "AI insight" }
        }
      }));

    decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, nextDecorations);
  }, [suggestionsData]);

  useEffect(() => {
    if (chatScrollerRef.current) {
      chatScrollerRef.current.scrollTop = chatScrollerRef.current.scrollHeight;
    }
  }, [chatMessages, chatLoading]);

  function handleEditorMount(editor, monaco) {
    editorRef.current = editor;
    monacoRef.current = monaco;
    editor.onDidChangeCursorPosition((event) => {
      setCursorPosition({
        lineNumber: event.position.lineNumber,
        column: event.position.column
      });
    });
  }

  function handleLanguageChange(event) {
    const nextLanguage = event.target.value;
    setLanguage((currentLanguage) => {
      if (code === STARTER_SNIPPETS[currentLanguage]) {
        setCode(STARTER_SNIPPETS[nextLanguage]);
      }

      return nextLanguage;
    });
    setReviewMarkdown(INITIAL_REVIEW_MARKDOWN);
    setReviewError("");
  }

  async function runReview() {
    if (!code.trim()) {
      setActivePanel("review");
      setReviewError("AI review could not start because the editor is empty.");
      setReviewMarkdown(INITIAL_REVIEW_MARKDOWN);
      return;
    }

    setActivePanel("review");
    setReviewLoading(true);
    setReviewError("");

    try {
      const response = await axios.post(`${API_BASE_URL}/ai/review`, {
        code,
        language
      });
      setReviewMarkdown(formatReviewResponse(response.data));
    } catch (error) {
      const serviceMessage = error.response?.data?.error;
      setReviewError(serviceMessage || "AI response is not being received right now. Please check the backend server or API key and try again.");
      setReviewMarkdown(INITIAL_REVIEW_MARKDOWN);
    } finally {
      setReviewLoading(false);
    }
  }

  async function sendChatMessage(event) {
    event.preventDefault();

    if (!chatInput.trim()) {
      return;
    }

    const nextMessages = [...chatMessages, { role: "user", content: chatInput.trim() }];
    setChatMessages(nextMessages);
    setChatInput("");
    setActivePanel("chat");
    setChatLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/ai/chat`, {
        code,
        language,
        messages: nextMessages
      });

      setChatMessages((currentMessages) => [
        ...currentMessages,
        {
          role: "assistant",
          content: response.data.answer || "I could not generate a response just now."
        }
      ]);
    } catch (error) {
      setChatMessages((currentMessages) => [
        ...currentMessages,
        {
          role: "assistant",
          content: "The chat service is temporarily unavailable."
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  function applySuggestion(item) {
    if (!editorRef.current || !item?.replacement || !Number.isInteger(item.line)) {
      return;
    }

    const model = editorRef.current.getModel();
    const currentLine = model.getLineContent(item.line);
    editorRef.current.executeEdits("ai-suggestion", [
      {
        range: new monacoRef.current.Range(item.line, 1, item.line, currentLine.length + 1),
        text: item.replacement
      }
    ]);
    editorRef.current.focus();
  }

  return (
    <main className="app-shell">
      <section className="workspace-shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">AI + IDE Hybrid Workspace</p>
            <h1>CodeSense Studio</h1>
          </div>

          <div className="topbar-actions">
            <label className="control-group">
              <span>Language</span>
              <select value={language} onChange={handleLanguageChange}>
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              className={`switch ${suggestionsEnabled ? "switch-on" : ""}`}
              onClick={() => setSuggestionsEnabled((current) => !current)}
            >
              Suggestions {suggestionsEnabled ? "ON" : "OFF"}
            </button>

            <button
              type="button"
              className="ghost-button"
              onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
            >
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </button>

            <button type="button" className="primary-button" onClick={runReview} disabled={reviewLoading}>
              {reviewLoading ? "Reviewing..." : "Review Code"}
            </button>
          </div>
        </header>

        <section className="workspace-grid">
          <article className="editor-card">
            <div className="editor-meta">
              <div>
                <strong>{languageMeta.label}</strong>
                <p>Cursor at line {cursorPosition.lineNumber}, column {cursorPosition.column}</p>
              </div>
              <button type="button" className="secondary-button" onClick={() => setCode(STARTER_SNIPPETS[language])}>
                Load Sample
              </button>
            </div>

            <div className="editor-frame">
              <Editor
                height="100%"
                language={languageMeta.monaco}
                theme={theme === "dark" ? "vs-dark" : "light"}
                value={code}
                onChange={(value) => setCode(value || "")}
                onMount={handleEditorMount}
                options={{
                  fontSize: 14,
                  minimap: { enabled: false },
                  wordWrap: "on",
                  scrollBeyondLastLine: false,
                  glyphMargin: true,
                  padding: { top: 18, bottom: 18 }
                }}
              />
            </div>
          </article>

          <aside className="panel-card">
            <div className="panel-tabs">
              {[
                { id: "suggestions", label: "Suggestions" },
                { id: "review", label: "Review" },
                { id: "chat", label: "AI Chat" }
              ].map((tab) => (
                <button
                  type="button"
                  key={tab.id}
                  className={activePanel === tab.id ? "tab-active" : ""}
                  onClick={() => setActivePanel(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activePanel === "suggestions" && (
              <div className="panel-content">
                <div className="panel-heading">
                  <div>
                    <h2>Live line-by-line guidance</h2>
                    <p>{suggestionsData.summary}</p>
                  </div>
                  {suggestionsLoading && <span className="status-pill">Updating</span>}
                </div>

                <div className="suggestion-list">
                  {suggestionsData.items.length === 0 ? (
                    <p className="empty-copy">No suggestions yet. Keep typing or move the cursor to another line.</p>
                  ) : (
                    suggestionsData.items.map((item, index) => (
                      <article key={`${item.title}-${item.line}-${index}`} className="suggestion-item">
                        <div className="suggestion-header">
                          <span className={`severity-badge ${severityClass(item.severity)}`}>{item.severity || "info"}</span>
                          <span>Line {item.line || "-"}</span>
                          <span>{item.type || "improvement"}</span>
                        </div>
                        <h3>{item.title}</h3>
                        <p>{item.detail}</p>
                        <strong>{item.suggestion}</strong>
                        {item.replacement ? (
                          <button type="button" className="secondary-button" onClick={() => applySuggestion(item)}>
                            Apply Fix
                          </button>
                        ) : null}
                      </article>
                    ))
                  )}
                </div>
              </div>
            )}

            {activePanel === "review" && (
              <div className="panel-content review-text-panel">
                <div className="panel-heading">
                  <div>
                    <h2>AI review report</h2>
                    <p>Readable review output with proper text formatting.</p>
                  </div>
                  {reviewLoading && <span className="status-pill">Analyzing</span>}
                </div>

                {reviewError ? <div className="error-banner">{reviewError}</div> : null}

                <article className="review-markdown">
                  <Markdown>{reviewMarkdown}</Markdown>
                </article>
              </div>
            )}

            {activePanel === "chat" && (
              <div className="panel-content chat-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Instruction chat</h2>
                    <p>Ask to optimize, convert language, explain a line, or debug a specific issue.</p>
                  </div>
                  {chatLoading && <span className="status-pill">Thinking</span>}
                </div>

                <div className="chat-thread" ref={chatScrollerRef}>
                  {chatMessages.map((message, index) => (
                    <article key={`${message.role}-${index}`} className={`chat-bubble ${message.role === "user" ? "chat-user" : "chat-assistant"}`}>
                      <span>{message.role === "user" ? "You" : "AI"}</span>
                      <Markdown>{message.content}</Markdown>
                    </article>
                  ))}
                </div>

                <form className="chat-form" onSubmit={sendChatMessage}>
                  <textarea
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    placeholder="Optimize this solution, convert it to Java, explain line 6..."
                    rows={3}
                  />
                  <button type="submit" className="primary-button" disabled={chatLoading}>
                    Send
                  </button>
                </form>
              </div>
            )}
          </aside>
        </section>
      </section>
    </main>
  );
}

export default App;
