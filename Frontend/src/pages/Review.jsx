import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import SuggestionPanel from "../components/SuggestionPanel";
import ReviewPanel from "../components/ReviewPanel";
import ChatPanel from "../components/ChatPanel";
import UserMenu from "../components/UserMenu";
import { useAuth } from "../context/AuthContext";
import { fetchSuggestions, fetchReview, fetchChat, saveReview } from "../services/api";
import { LANGUAGE_OPTIONS, STARTER_SNIPPETS, INITIAL_CHAT, INITIAL_REVIEW_MARKDOWN } from "../constants";

function getPlaceholder(lang) {
  const comment = lang === "python" ? "#" : "//";
  return `${comment} Write your first code or paste your code here...`;
}

const LINE_LIMIT = 80;

function extractInlineCode(markdown) {
  const match = markdown.match(/### INLINE CODE\n+```(?:\w*)\s*([\s\S]*?)```/i);
  if (match) return match[1].trim();
  return null;
}

function stripInlineCodeSection(markdown) {
  return markdown.replace(/### INLINE CODE[\s\S]*?(?=### |$)/i, "");
}

function limitLines(text, max = LINE_LIMIT) {
  if (!text) return text;
  const lines = text.split("\n");
  if (lines.length <= max) return text;
  return lines.slice(0, max).join("\n");
}

function formatReviewResponse(review) {
  function asList(items, fallback) {
    if (!Array.isArray(items) || items.length === 0) return [`- ${fallback}`];
    return items.map((item) => `- ${item}`);
  }

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

export default function Review() {
  const navigate = useNavigate();
  const { theme } = useAuth();
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState(getPlaceholder("javascript"));
  const [suggestionsEnabled, setSuggestionsEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState("review");
  const [cursorPosition, setCursorPosition] = useState({ lineNumber: 1, column: 1 });
  const [suggestionsData, setSuggestionsData] = useState({ summary: "Live suggestions will appear here as you type.", items: [] });
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

  // Calculate line count
  const lineCount = code.split('\n').length;
  const linePercentage = Math.min((lineCount / LINE_LIMIT) * 100, 100);

  useEffect(() => {
    if (!suggestionsEnabled) {
      setSuggestionsLoading(false);
      setSuggestionsData({ summary: "Live AI suggestions are paused. Turn them back on anytime.", items: [] });
      return;
    }
    if (!code.trim() || code === getPlaceholder(language)) {
      setSuggestionsData({ summary: "Write real code to start receiving suggestions.", items: [] });
      return;
    }

    const requestId = suggestionRequestRef.current + 1;
    suggestionRequestRef.current = requestId;

    const timer = setTimeout(async () => {
      setSuggestionsLoading(true);
      try {
        const data = await fetchSuggestions(code, language, cursorPosition.lineNumber);
        if (suggestionRequestRef.current === requestId) {
          setSuggestionsData({
            summary: data.summary || "Suggestions updated.",
            items: Array.isArray(data.items) ? data.items : []
          });
        }
      } catch {
        if (suggestionRequestRef.current === requestId) {
          setSuggestionsData({ summary: "Suggestion service is temporarily unavailable.", items: [] });
        }
      } finally {
        if (suggestionRequestRef.current === requestId) {
          setSuggestionsLoading(false);
        }
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [code, language, cursorPosition.lineNumber, suggestionsEnabled]);

  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;

    const nextDecorations = suggestionsData.items
      .filter((item) => Number.isInteger(item.line) && item.line > 0)
      .map((item) => ({
        range: new monacoRef.current.Range(item.line, 1, item.line, 1),
        options: {
          isWholeLine: true,
          className: `editor-line-highlight ${item.severity === "error" ? "severity-error" : item.severity === "warning" ? "severity-warning" : "severity-info"}`,
          glyphMarginClassName: `editor-glyph ${item.severity === "error" ? "severity-error" : item.severity === "warning" ? "severity-warning" : "severity-info"}`,
          glyphMarginHoverMessage: { value: item.title || item.suggestion || "AI insight" }
        }
      }));

    decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, nextDecorations);
  }, [suggestionsData]);

  function handleEditorMount(editor, monaco) {
    editorRef.current = editor;
    monacoRef.current = monaco;

    let isTruncating = false;

    editor.onDidChangeModelContent(() => {
      if (isTruncating) {
        isTruncating = false;
        return;
      }

      const model = editor.getModel();
      const text = model.getValue();
      const lines = text.split("\n");

      if (lines.length > LINE_LIMIT) {
        isTruncating = true;
        const truncated = lines.slice(0, LINE_LIMIT).join("\n");
        model.setValue(truncated);
        setCode(truncated);
        return;
      }

      setCode(text);
    });

    editor.onDidChangeCursorPosition((event) => {
      setCursorPosition({
        lineNumber: event.position.lineNumber,
        column: event.position.column
      });
    });
  }

  function handleLanguageChange(event) {
    const nextLanguage = event.target.value;
    setLanguage((prev) => {
      if (code === STARTER_SNIPPETS[prev]) {
        setCode(limitLines(STARTER_SNIPPETS[nextLanguage]));
      } else if (code === getPlaceholder(prev)) {
        setCode(getPlaceholder(nextLanguage));
      }
      return nextLanguage;
    });
    setReviewMarkdown(INITIAL_REVIEW_MARKDOWN);
    setReviewError("");
  }

  async function runReview() {
    if (!code.trim()) {
      setActiveTab("review");
      setReviewError("Editor is empty. Write some code first.");
      setReviewMarkdown(INITIAL_REVIEW_MARKDOWN);
      return;
    }
    setActiveTab("review");
    setReviewLoading(true);
    setReviewError("");
    try {
      const data = await fetchReview(code, language);
      const raw = typeof data === "string" ? data : formatReviewResponse(data);
      const inlineCode = extractInlineCode(raw);
      if (inlineCode && editorRef.current) {
        const model = editorRef.current.getModel();
        model.setValue(inlineCode);
        setCode(inlineCode);
      }
      const stripped = stripInlineCodeSection(raw);
      setReviewMarkdown(stripped);
      saveReview(code, language, stripped).catch(() => {});
    } catch (error) {
      setReviewError(error.message || "Review service unavailable. Check backend.");
      setReviewMarkdown(INITIAL_REVIEW_MARKDOWN);
    } finally {
      setReviewLoading(false);
    }
  }

  async function sendChatMessage(event) {
    event.preventDefault();
    if (!chatInput.trim()) return;
    const nextMessages = [...chatMessages, { role: "user", content: chatInput.trim() }];
    setChatMessages(nextMessages);
    setChatInput("");
    setActiveTab("chat");
    setChatLoading(true);
    try {
      const data = await fetchChat(code, language, nextMessages);
      setChatMessages((prev) => [...prev, { role: "assistant", content: data.answer || "No response." }]);
    } catch (error) {
      setChatMessages((prev) => [...prev, { role: "assistant", content: `⚠️ ${error.message || "Chat service unavailable."}` }]);
    } finally {
      setChatLoading(false);
    }
  }

  function applySuggestion(item) {
    if (!editorRef.current || !item?.replacement || !Number.isInteger(item.line)) return;
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

  const tabs = [
    { id: "review", label: "Review" },
    { id: "suggestions", label: "Suggestions" },
    { id: "chat", label: "Chat" }
  ];

  return (
    <div className="h-screen bg-gray-950 flex flex-col">
      <header className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-gray-950/80 backdrop-blur-sm shrink-0">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-gray-400 hover:text-gray-200 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm font-medium">CodeReviewer</span>
        </button>

        <div className="flex items-center gap-3">
          <select
            value={language}
            onChange={handleLanguageChange}
            className="bg-white/[0.03] border border-white/5 rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-emerald-500/30"
          >
            {LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setSuggestionsEnabled((p) => !p)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              suggestionsEnabled
                ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/5"
                : "border-white/5 text-gray-500"
            }`}
          >
            Suggestions {suggestionsEnabled ? "ON" : "OFF"}
          </button>

          <UserMenu />
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        <div className="flex-[65] min-w-0 border-r border-white/5 flex flex-col">
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-white/[0.02] shrink-0">
            <div className="flex items-center gap-3 text-sm">
              <span className="px-2.5 py-1 rounded-md bg-white/5 text-emerald-400 font-medium text-xs uppercase tracking-wider">
                {LANGUAGE_OPTIONS.find(o => o.value === language)?.label || language}
              </span>
              <span className="text-gray-500 text-xs">
                Ln {cursorPosition.lineNumber}, Col {cursorPosition.column}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCode(limitLines(STARTER_SNIPPETS[language]))}
                className="text-xs text-gray-400 hover:text-gray-200 transition-colors px-3 py-1.5 rounded-lg border border-white/5 hover:border-white/20"
              >
                Load Sample
              </button>
              <div className="flex items-center gap-2">
                <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      linePercentage < 50 ? 'bg-emerald-500' : linePercentage < 80 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${linePercentage}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 font-medium w-12 text-right">
                  {lineCount}/{LINE_LIMIT}
                </span>
              </div>
            </div>
          </div>
          <div className="flex-1 min-h-0 relative">
            <Editor
              height="100%"
              language={LANGUAGE_OPTIONS.find(o => o.value === language)?.monaco || "javascript"}
              theme={theme === "dark" ? "vs-dark" : "light"}
               value={code}
               onMount={handleEditorMount}
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                wordWrap: "on",
                scrollBeyondLastLine: false,
                glyphMargin: true,
                padding: { top: 18, bottom: 18 },
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                fontLigatures: true
              }}
            />
          </div>
        </div>

        <div className="flex-[35] min-w-0 flex flex-col">
          <div className="flex border-b border-white/5 shrink-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 text-xs font-medium py-3 px-4 transition-colors relative ${
                  activeTab === tab.id
                    ? "text-emerald-400"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-emerald-500 rounded-full" />
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 min-h-0">
            {activeTab === "review" && (
              <ReviewPanel
                reviewMarkdown={reviewMarkdown}
                reviewLoading={reviewLoading}
                reviewError={reviewError}
                runReview={runReview}
              />
            )}
            {activeTab === "suggestions" && (
              <SuggestionPanel
                suggestionsData={suggestionsData}
                suggestionsLoading={suggestionsLoading}
                applySuggestion={applySuggestion}
              />
            )}
            {activeTab === "chat" && (
              <ChatPanel
                chatMessages={chatMessages}
                chatLoading={chatLoading}
                chatInput={chatInput}
                setChatInput={setChatInput}
                sendChatMessage={sendChatMessage}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
