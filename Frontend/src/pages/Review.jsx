import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import SuggestionPanel from "../components/SuggestionPanel";
import ReviewPanel from "../components/ReviewPanel";
import ChatPanel from "../components/ChatPanel";
import UserMenu from "../components/UserMenu";
import ToggleSwitch from "../components/ToggleSwitch";
import { useAuth } from "../context/AuthContext";
import Tesseract from 'tesseract.js';
import { fetchSuggestions, fetchReview, fetchChat, saveReview, validateExtractedCode, extractCodeWithVision /*, executeCode */ } from "../services/api";
import { STARTER_SNIPPETS, INITIAL_CHAT, INITIAL_REVIEW_MARKDOWN } from "../constants";

function getPlaceholder(lang) {
  const comment = lang === "python" ? "#" : "//";
  return `${comment} Write your first code or paste your code here...`;
}

const LINE_LIMIT = 80;
const MAX_CHAT_HISTORY = 10;

const CACHED_JS_REVIEW = `### QUALITY SCORE
  ⭐ Overall: 8/10
  📊 Readability: 8/10 | ⚡ Performance: 8/10 | 🏗️ Structure: 8/10

---

### INLINE CODE
\`\`\`javascript
function twoSum(nums, target) { // ✅ Clear function name indicates purpose
  const seen = new Map(); // ✅ Using Map for storing previously seen numbers

  for (let index = 0; index < nums.length; index += 1) { // ⚠️ Consider using \`for...of\` for better readability
    const complement = target - nums[index]; //

    if (seen.has(complement)) { //
      return [seen.get(complement), index]; //
    }

    seen.set(nums[index], index); //
  }

  return []; // ❌ Returning an empty array without a comment may confuse users
}
\`\`\`

---

### APPROACH
  🧩 Two-pointer algorithm — A technique to find pairs that sum to a target value.

---

### COMPLEXITY
  ⏱️ Time: O(n) — We loop through the numbers once
  💾 Space: O(n) — We store numbers in a map

---

### SUGGESTIONS

┌─────────────────────────────────────────┐
│ 💡 #1 — Improve Empty Return Clarity   │
│ Impact: 🟡 Medium                       │
│ Type: Readability                       │
│                                          │
│ ❌ Current:                              │
│ return [];                               │
│                                          │
│ ✅ Better:                               │
│ return []; // No pairs were found        │
│                                          │
│ 📖 Why                                    │
│ It helps others understand why           │
└─────────────────────────────────────────┘

---

### KEY LINES
  🔍 Max 3 most important lines:
  → Line 9: return [seen.get(complement), index];
     └─ This is the main return statement that provides the solution.

---

### WHAT YOU DID WELL
  ✅ You used a Map for efficient lookups.
  ✅ The code structure is clean and logical.
  ✅ The function does exactly what it's meant to do.

---

### NEXT STEP
  🎓 Learn about error handling — It will help you write more robust and user-friendly code.`;

function quickHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function detectLanguage(code) {
  if (!code || code.trim().length < 10) return null;
  const c = code.trim();

  if (/^import\s+java\.|public\s+(class|interface|enum)\s+|System\.(out|in|err)\s*\.|@(Override|Deprecated|SuppressWarnings)|String\[\]\s+args|void\s+main\s*\(/.test(c)) return "java";
  if (/for\s*\(\s*(int|long|byte|short|double|float|boolean|char|String)\s+\w+\s*[=:]/.test(c)) return "java";
  if(/\w+\[\]\s+\w+\s*=|new\s+\w+(?:\[\]|\[\d+\])/.test(c) && /int|String|double|float|boolean|char/.test(c)) return "java";

  if (/^import\s+\w+$|^from\s+\w+\s+import|def\s+\w+\s*\(|print\s*\(|if\s+__name__\s*==/m.test(c)) return "python";

  if (/#include\s*[<"]|std::|int\s+main\s*\(/.test(c)) return "cpp";
  if (/for\s*\(\s*(int|long|double|float|char|bool|auto|size_t)\s+\w+\s*[=:]/.test(c)) return "cpp";
  if (/cout\s*<<|cin\s*>>/.test(c)) return "cpp";

  if (/=>|\bconst\s+\w+\s*=|let\s+\w+\s*=|console\.\w+|document\.\w+|function\s+\w+\s*\(/.test(c)) return "javascript";

  return null;
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
  const [suggestionsEnabled, setSuggestionsEnabled] = useState(false);
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
  const [imagePreview, setImagePreview] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState("");
  const [extractionStep, setExtractionStep] = useState(null);
  const [imageMode, setImageMode] = useState('ocr');
  const [isDragOver, setIsDragOver] = useState(false);
  const [showImageSection, setShowImageSection] = useState(false);
  // const [output, setOutput] = useState([]);
  // const [running, setRunning] = useState(false);
  // const [runErrorItems, setRunErrorItems] = useState([]);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showLineLimitWarning, setShowLineLimitWarning] = useState(true);
  const [isSampleLoaded, setIsSampleLoaded] = useState(false);
  const fileInputRef = useRef(null);

  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef([]);
  // const runErrorDecorationsRef = useRef([]);
  const suggestionRequestRef = useRef(0);
  const lastSuggestCodeRef = useRef(null);
  const lastReviewCodeRef = useRef(null);
  const fileRef = useRef(null);
  const prevCodeRef = useRef(code);

  const lineCount = code.split('\n').length;
  const isOverLimit = lineCount >= LINE_LIMIT;
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

    const currentHash = quickHash(code);
    if (currentHash === lastSuggestCodeRef.current) return;

    const requestId = suggestionRequestRef.current + 1;
    suggestionRequestRef.current = requestId;

    const timer = setTimeout(async () => {
      setSuggestionsLoading(true);
      try {
        lastSuggestCodeRef.current = currentHash;
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

  useEffect(() => {
    const placeholder = getPlaceholder(language);
    if (!code.trim() || code === placeholder || code === STARTER_SNIPPETS[language]) return;

    const prev = prevCodeRef.current;
    prevCodeRef.current = code;

    const codeDiff = Math.abs(code.length - prev.length);
    if (codeDiff < 15) return;

    const detected = detectLanguage(code);
    if (detected && detected !== language) {
      setLanguage(detected);
    }
  }, [code]);

  function handleEditorMount(editor, monaco) {
    editorRef.current = editor;
    monacoRef.current = monaco;

    let isTruncating = false;

    editor.onDidChangeModelContent(() => {
      if (isTruncating) {
        isTruncating = false;
        return;
      }

      // if (runErrorDecorationsRef.current.length > 0) {
      //   runErrorDecorationsRef.current = editorRef.current.deltaDecorations(runErrorDecorationsRef.current, []);
      //   setRunErrorItems([]);
      // }

      const model = editor.getModel();
      const text = model.getValue();
      const lines = text.split("\n");

      if (lines.length > LINE_LIMIT) {
        isTruncating = true;
        const truncated = lines.slice(0, LINE_LIMIT).join("\n");
        model.setValue(truncated);
        setCode(truncated);
        setShowLineLimitWarning(true);
        return;
      }

      setCode(text);
      setIsSampleLoaded(false);
    });

    editor.onDidChangeCursorPosition((event) => {
      setCursorPosition({
        lineNumber: event.position.lineNumber,
        column: event.position.column
      });
    });
  }

  async function processExtraction(dataUrl, file) {
    setExtractionStep('uploading');
    setExtracting(true);
    setExtractError("");
    setImagePreview(dataUrl);

    if (imageMode === 'vision') {
      try {
        setExtractionStep('validating');
        const result = await extractCodeWithVision(dataUrl);
        if (result.code) {
          setCode(result.code);
          if (result.language && result.language !== "unknown") {
            setLanguage(result.language);
          }
          setExtractionStep(null);
          setExtracting(false);
          setExtractError("");
          runReview(result.code, result.language);
          // setRunning(true);
          // executeAndShowErrors(result.code, result.language).finally(() => setRunning(false));
        } else {
          setExtractionStep('error');
          setExtractError("No code could be extracted from the image.");
          setExtracting(false);
        }
      } catch {
        setExtractionStep('error');
        setExtractError("AI Vision extraction failed. Try OCR mode.");
        setExtracting(false);
      }
      return;
    }

    try {
      setExtractionStep('ocr');
      const { data: { text } } = await Tesseract.recognize(file || dataUrl, 'eng', {
        workerPath: '/worker.min.js',
        langPath: '/tessdata/'
      });
      if (!text.trim()) {
        setExtractionStep('error');
        setExtractError("No text could be extracted from the image.");
        setExtracting(false);
        return;
      }
      setExtractionStep('validating');
      const result = await validateExtractedCode(text);
      if (result.valid) {
        const extractedCode = result.code || text;
        setCode(extractedCode);
        if (result.language && result.language !== "unknown" && result.language !== "other") {
          setLanguage(result.language);
        }
        setExtractionStep(null);
        setExtracting(false);
        setExtractError("");
        runReview(extractedCode, result.language);
        // setRunning(true);
        // executeAndShowErrors(extractedCode, result.language).finally(() => setRunning(false));
      } else {
        const messages = {
          no_code: "No code detected in the image. Please upload an image containing source code.",
          unclear: "Code detected but the image is unclear. Please upload a clearer screenshot."
        };
        setExtractionStep('error');
        setExtractError(result.message || messages[result.reason] || "Could not extract code from the image.");
        setExtracting(false);
      }
    } catch {
      setExtractionStep('error');
      setExtractError("Failed to process the image. Try a clearer screenshot.");
      setExtracting(false);
    }
  }

  async function handleImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setExtractError("Please upload an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setExtractError("Image must be under 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target.result;
      fileRef.current = file;
      await processExtraction(dataUrl, file);
    };
    reader.readAsDataURL(file);
  }

  async function retryExtraction() {
    if (!imagePreview) return;
    setExtractionStep(null);
    setExtractError("");
    await processExtraction(imagePreview, fileRef.current);
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = e.dataTransfer?.files;
    if (files?.length > 0) {
      handleImageUpload({ target: { files } });
    }
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }

  function clearImage() {
    setImagePreview(null);
    setExtractError("");
    setExtractionStep(null);
  }

  function parseCompilerErrors(text, lang) {
    if (!text) return [];
    const items = [];
    const lines = text.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (lang === "java" || lang === "cpp") {
        const m = line.match(/\.(?:java|cpp):(\d+):(?:\d+:)?\s*(error|warning|note):\s*(.+)/i);
        if (m) {
          const ln = parseInt(m[1]);
          const severity = m[2].toLowerCase() === "warning" ? "warning" : "error";
          const msg = m[3].trim();
          const detail = lines[i + 1]?.trim() || msg;
          items.push({ line: ln, severity, title: msg, detail, suggestion: "", replacement: "" });
        }
      }

      if (lang === "python") {
        const m = line.match(/File\s+".+",\s+line\s+(\d+)/i);
        if (m) {
          const ln = parseInt(m[1]);
          const errLine = lines[i + 1] || "";
          items.push({ line: ln, severity: "error", title: errLine, detail: errLine, suggestion: "", replacement: "" });
        }
      }
    }

    if (lang === "javascript") {
      for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(/(?:code\.js|evalmachine):(\d+)/i);
        if (m) {
          const ln = parseInt(m[1]);
          const msg = (lines[i + 1] || lines[i]).replace(/.*?:\d+\s*/, "");
          items.push({ line: ln, severity: "error", title: msg || lines[i], detail: msg || lines[i], suggestion: "", replacement: "" });
        }
      }
    }

    return items;
  }

  // useEffect(() => {
  //   if (!editorRef.current || !monacoRef.current) return;

  //   const nextDecorations = runErrorItems
  //     .filter((item) => Number.isInteger(item.line) && item.line > 0)
  //     .map((item) => ({
  //       range: new monacoRef.current.Range(item.line, 1, item.line, 1),
  //       options: {
  //         isWholeLine: true,
  //         className: "editor-line-highlight severity-error",
  //         glyphMarginClassName: "editor-glyph severity-error",
  //         glyphMarginHoverMessage: { value: item.title || "Runtime error" }
  //       }
  //     }));

  //     runErrorDecorationsRef.current = editorRef.current.deltaDecorations(runErrorDecorationsRef.current, nextDecorations);
  //   }, [runErrorItems]);

  // async function executeAndShowErrors(execCode, execLang) {
  //   if (!execCode.trim()) return;
  //   try {
  //     const result = await executeCode(execCode.trim(), execLang);
  //     const logs = [];

  //     if (result.error) {
  //       logs.push({ type: "error", text: result.error });
  //       const parsed = parseCompilerErrors(result.error, execLang);
  //       if (parsed.length > 0) {
  //         setRunErrorItems(parsed);
  //       }
  //     }
  //     if (result.output) {
  //       result.output.split("\n").forEach(line => logs.push({ type: "log", text: line }));
  //     }
  //     if (!result.output && !result.error) {
  //       logs.push({ type: "log", text: "(no output)" });
  //     }

  //     setOutput(logs);
  //   } catch (err) {
  //     setOutput([{ type: "error", text: err.message || "Execution failed." }]);
  //   }
  // }

  // async function runCode() {
  //   if (!code.trim()) {
  //     setOutput([{ type: "error", text: "No code to run." }]);
  //     setRunErrorItems([]);
  //     return;
  //   }
  //   setRunning(true);
  //   setOutput([]);
  //   setRunErrorItems([]);
  //   await executeAndShowErrors(code, language);
  //   setRunning(false);
  // }

  // function clearOutput() {
  //   setOutput([]);
  // }

  async function runReview(overrideCode, overrideLang) {
    const reviewCode = typeof overrideCode === "string" ? overrideCode : (code ?? "");
    const reviewLang = overrideLang ?? language;
    const placeholder = getPlaceholder(reviewLang);
    if (!reviewCode.trim() || reviewCode === placeholder) {
      setActiveTab("review");
      setReviewError("Please write a code or add a file");
      setReviewMarkdown(INITIAL_REVIEW_MARKDOWN);
      return;
    }
    const reviewHash = quickHash(reviewCode);
    if (reviewHash === lastReviewCodeRef.current && !overrideCode) {
      setActiveTab("review");
      setReviewError("This code was already reviewed. Edit the code first.");
      setReviewMarkdown(INITIAL_REVIEW_MARKDOWN);
      return;
    }
    lastReviewCodeRef.current = reviewHash;

    if (reviewCode.trim() === STARTER_SNIPPETS.javascript.trim()) {
      setActiveTab("review");
      setReviewMarkdown(CACHED_JS_REVIEW);
      setReviewError("");
      saveReview(reviewCode, reviewLang, CACHED_JS_REVIEW).catch(() => {});
      return;
    }

    setActiveTab("review");
    setSuggestionsEnabled(true);
    setReviewLoading(true);
    setReviewError("");
    try {
      const data = await fetchReview(reviewCode, reviewLang);
      const raw = typeof data === "string" ? data : formatReviewResponse(data);
      setReviewMarkdown(raw);
      saveReview(reviewCode, reviewLang, raw).catch(() => {});
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
      const chatCode = code === getPlaceholder(language) || code === STARTER_SNIPPETS[language] ? "" : code;
      const trimmedMessages = nextMessages.length > MAX_CHAT_HISTORY
        ? [nextMessages[0], ...nextMessages.slice(-(MAX_CHAT_HISTORY - 1))]
        : nextMessages;
      const data = await fetchChat(chatCode, language, trimmedMessages);
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

  const lineBarColor = lineCount < 60 ? "bg-emerald-500" : lineCount < 76 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="h-screen bg-gray-950 flex flex-col">
      <header className="flex items-center justify-between px-3 lg:px-5 py-2 lg:py-3 border-b border-white/5 bg-gray-950 shrink-0 gap-2">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 lg:gap-2 text-gray-400 hover:text-gray-200 transition-colors shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-xs lg:text-sm font-medium hidden sm:inline">CodeReviewer</span>
        </button>

        <div className="flex items-center gap-1.5 lg:gap-3 flex-wrap justify-end">
          <ToggleSwitch
            enabled={imageMode === 'vision'}
            onChange={() => setImageMode((p) => p === 'ocr' ? 'vision' : 'ocr')}
            label={imageMode === 'vision' ? 'AI Vision' : 'OCR'}
            size="sm"
          />

          <ToggleSwitch
            enabled={suggestionsEnabled}
            onChange={() => setSuggestionsEnabled((p) => !p)}
            label="Suggestions"
            size="sm"
          />

          <UserMenu />
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        <div className="flex-1 lg:flex-[65] lg:min-w-0 border-b lg:border-b-0 lg:border-r border-white/5 flex flex-col min-h-0">
          <div className="flex items-center justify-between px-2 lg:px-5 py-1.5 lg:py-3 border-b border-white/5 bg-white/[0.02] shrink-0 gap-1 lg:gap-2">
            <div className="flex items-center gap-1.5 lg:gap-3 text-sm min-w-0">
              <span className="px-1.5 lg:px-2.5 py-0.5 rounded-md bg-white/5 text-emerald-400 font-medium text-[10px] lg:text-xs uppercase tracking-wider shrink-0">
                {language === "javascript" ? "JS" : language === "python" ? "Python" : language === "java" ? "Java" : language === "cpp" ? "C++" : language}
              </span>
              <span className="text-gray-500 text-[10px] lg:text-xs hidden sm:inline">
                Ln {cursorPosition.lineNumber}, Col {cursorPosition.column}
              </span>
            </div>
            <div className="flex items-center gap-1 lg:gap-2 shrink-0">
              <button
                type="button"
                onClick={async () => {
                  const sampleCode = limitLines(STARTER_SNIPPETS.javascript);
                  setCode(sampleCode);
                  setIsSampleLoaded(true);
                  setActiveTab("review");
                  setReviewMarkdown(CACHED_JS_REVIEW);
                  setReviewError("");
                  lastReviewCodeRef.current = quickHash(sampleCode);
                  await saveReview(sampleCode, "javascript", CACHED_JS_REVIEW).catch(() => {});
                }}
                className="text-[10px] lg:text-xs text-gray-400 hover:text-gray-200 transition-colors px-1.5 lg:px-3 py-0.5 lg:py-1.5 rounded-lg border border-white/5 hover:border-white/20"
              >
                JS Sample <span className="text-emerald-400 ml-0.5" title="Preloaded review, no AI call">*</span>
              </button>
              <div className="flex items-center gap-1 lg:gap-1.5">
                <div className="w-10 lg:w-20 h-1 bg-white/5 rounded-full overflow-hidden hidden sm:block">
                  <div
                    className={`h-full rounded-full transition-all ${lineBarColor}`}
                    style={{ width: `${linePercentage}%` }}
                  />
                </div>
                <span
                  className="text-[10px] lg:text-xs text-gray-500 font-medium w-8 lg:w-10 text-right relative group cursor-default"
                  title="Editor caps at 80 lines for AI cost management."
                >
                  {lineCount}/{LINE_LIMIT}
                  <span className="absolute bottom-full -right-4 lg:right-0 mb-1.5 hidden group-hover:flex bg-gray-800 text-gray-200 text-[10px] lg:text-xs rounded-lg px-2 lg:px-3 py-1 lg:py-2 whitespace-nowrap shadow-lg border border-white/10 z-50">
                    Editor capped at 80 lines for AI cost management.
                  </span>
                </span>
              </div>
            </div>
          </div>
          {showLineLimitWarning && isOverLimit && (
            <div className="shrink-0 bg-amber-500/10 border-b border-amber-500/20 px-3 lg:px-5 py-2 lg:py-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-xs text-amber-300">
                  Your code has been capped at 80 lines to manage AI costs. Only the first 80 lines will be reviewed.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowLineLimitWarning(false)}
                className="text-xs text-amber-400 hover:text-amber-300 transition-colors shrink-0 ml-3"
              >
                Dismiss
              </button>
            </div>
          )}
          <div className="lg:hidden shrink-0 border-b border-white/5">
            <button
              type="button"
              onClick={() => setShowImageSection((p) => !p)}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
            >
              {showImageSection ? (
                <>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Switch to Code
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Upload Image
                </>
              )}
            </button>
          </div>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !imagePreview && !extracting && fileInputRef.current?.click()}
            className={`shrink-0 border-b border-white/5 transition-all duration-200 cursor-pointer ${
              isDragOver
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : imagePreview
                  ? 'bg-white/[0.02]'
                  : 'bg-white/[0.01] hover:bg-white/[0.03]'
            } ${showImageSection || imagePreview ? '' : 'hidden'} lg:block`}
          >
            {imagePreview ? (
              <div className="flex items-center gap-2 lg:gap-3 px-3 lg:px-5 py-3 lg:py-6">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowImageModal(true); }}
                  className="w-14 h-9 rounded-md overflow-hidden border border-white/10 shrink-0 bg-gray-900 hover:border-emerald-500/50 transition-colors"
                >
                  <img src={imagePreview} alt="Uploaded" className="w-full h-full object-cover" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 font-medium">
                    {isDragOver ? 'Drop image to replace' : 'Image Uploaded'}
                  </p>
                  <p className="text-xs text-gray-600">{isDragOver ? '' : 'Code extracted to editor'}</p>
                </div>
                <label
                  onClick={(e) => e.stopPropagation()}
                  className="cursor-pointer text-xs text-gray-400 hover:text-gray-200 transition-colors px-3 py-1 rounded-lg border border-white/5 hover:border-white/20"
                >
                  Replace
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); clearImage(); }}
                  className="text-xs text-gray-500 hover:text-red-400 transition-colors px-2 py-1"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center px-3 lg:px-5 py-6 lg:py-12 gap-2">
                <svg className={`w-4 h-4 ${isDragOver ? 'text-emerald-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className={`text-xs ${isDragOver ? 'text-emerald-400' : 'text-gray-500'}`}>
                  {isDragOver ? 'Drop image to upload code' : 'Drop an image here or click to browse'}
                </span>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </div>
          <div className="flex-1 min-h-0 relative">
            <Editor
              height="100%"
              language={language}
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
                fontLigatures: true,
                lineNumbersMinChars: 3
              }}
            />
          </div>
          {/* <div className="shrink-0 border-t border-white/5 bg-gray-950/80">
            <div className="flex items-center justify-between px-4 py-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={runCode}
                  disabled={running}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-emerald-500 text-gray-950 font-medium hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  {running ? "Running..." : "Run Code"}
                </button>
                {output.length > 0 && (
                  <button
                    type="button"
                    onClick={clearOutput}
                    className="text-xs text-gray-500 hover:text-gray-300 transition-colors px-2 py-1"
                  >
                    Clear
                  </button>
                )}
              </div>
              {output.length > 0 && (
                <span className="text-xs text-gray-600">
                  {output.filter(l => l.type === "error").length > 0 ? "Exited with errors" : "Finished"}
                </span>
              )}
            </div>
            {output.length > 0 && (
              <div className="max-h-32 overflow-auto border-t border-white/5 bg-[#0d0d0d] font-mono text-xs leading-relaxed">
                {output.map((line, i) => (
                  <div
                    key={i}
                    className={`px-4 py-0.5 ${
                      line.type === "error" ? "text-red-400" :
                      line.type === "warn" ? "text-yellow-400" :
                      line.type === "result" ? "text-emerald-400" :
                      "text-gray-300"
                    }`}
                  >
                    {line.type === "result" && <span className="text-gray-600 mr-1">{' => '}</span>}
                    {line.text}
                  </div>
                ))}
              </div>
            )}
          </div> */}
        </div>

        <div className="flex-1 lg:flex-[35] min-w-0 flex flex-col">
          <div className="flex border-b border-white/5 shrink-0 overflow-x-auto">
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
                isSampleLoaded={isSampleLoaded}
                extractionState={{ step: extractionStep, error: extractError, extracting, imageMode, onToggleMode: () => setImageMode((p) => p === 'ocr' ? 'vision' : 'ocr'), onRetry: retryExtraction }}
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

      {showImageModal && imagePreview && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setShowImageModal(false)}
        >
          <div
            className="relative max-w-[90vw] max-h-[90vh] rounded-xl overflow-hidden border border-white/10 bg-gray-950 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-2 right-2 lg:top-3 lg:right-3 flex items-center gap-1.5 lg:gap-2 z-10">
              <button
                type="button"
                onClick={() => { clearImage(); setShowImageModal(false); }}
                className="px-2 lg:px-3 py-1 lg:py-1.5 text-xs font-medium rounded-lg bg-red-500/80 text-white hover:bg-red-500 transition-colors"
              >
                Remove
              </button>
              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                className="w-6 h-6 lg:w-7 lg:h-7 rounded-full bg-black/50 text-gray-300 hover:text-white flex items-center justify-center text-sm transition-colors"
              >
                ✕
              </button>
            </div>
            <img src={imagePreview} alt="Uploaded code" className="max-w-full max-h-[90vh] object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}
