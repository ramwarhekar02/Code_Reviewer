import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import ToggleSwitch from "./ToggleSwitch";

function normalizeMarkdown(text) {
  if (!text) return text;
  return text
    .replace(/([^\n])```/g, "$1\n```")
    .replace(/```([^\n])/g, "```\n$1")
    .replace(/```\n+```/g, "```\n```")
    .replace(/^([📊⚡🏗️]\D*?\d+\/\d+)\s*\|\s*/gm, "$1\n");
}

function splitSections(markdown) {
  return markdown.split(/(?=### )/).map((part) => {
    const m = part.match(/^### (.+)/);
    const header = m ? m[1].trim() : null;
    const body = m ? part.replace(/^### .+\n?/, "") : part;
    return { header, body };
  }).filter((s) => s.header && s.body.replace(/[-─\s]/g, "").trim());
}

const SECTION_STYLES = {
  "QUALITY SCORE": { border: "border-l-emerald-500", badge: "bg-emerald-500/10 text-emerald-400", label: "Quality Score" },
  "INLINE CODE": { border: "border-l-sky-500", badge: "bg-sky-500/10 text-sky-400", label: "Inline Code" },
  APPROACH: { border: "border-l-blue-500", badge: "bg-blue-500/10 text-blue-400", label: "Approach" },
  COMPLEXITY: { border: "border-l-purple-500", badge: "bg-purple-500/10 text-purple-400", label: "Complexity" },
  SUGGESTIONS: { border: "border-l-amber-500", badge: "bg-amber-500/10 text-amber-400", label: "Suggestions" },
  "WHAT YOU DID WELL": { border: "border-l-emerald-500", badge: "bg-emerald-500/10 text-emerald-400", label: "Done Well" },
  "NEXT STEP": { border: "border-l-rose-500", badge: "bg-rose-500/10 text-rose-400", label: "Next Step" }
};

function getSectionStyle(header) {
  for (const [key, style] of Object.entries(SECTION_STYLES)) {
    if (header.toUpperCase().includes(key)) return style;
  }
  return { border: "border-l-gray-500", badge: "bg-white/5 text-gray-400", label: header || "Section" };
}

function CodeBlock({ children, showLineNumbers }) {
  const code = String(children).replace(/\n$/, "");
  const lines = code.split("\n");

  function getSymbolColor(line) {
    if (line.includes("✅")) return "text-emerald-400";
    if (line.includes("⚠️")) return "text-yellow-400";
    if (line.includes("❌")) return "text-red-400";
    if (line.includes("💡")) return "text-blue-400";
    if (line.includes("🔵")) return "text-purple-400";
    return null;
  }

  return (
    <div className="bg-[#1a1a1a] rounded-lg my-3 overflow-x-auto font-mono text-sm leading-relaxed border border-white/5">
      {lines.map((line, i) => {
        const color = getSymbolColor(line);
        return (
          <div key={i} className={`flex ${color || "text-gray-300"}`}>
            {showLineNumbers && (
              <span className="text-gray-600 text-xs w-8 text-right select-none shrink-0 pr-3 border-r border-white/5 mr-3">{i + 1}</span>
            )}
            <span className="flex-1">{line || "\u00A0"}</span>
          </div>
        );
      })}
    </div>
  );
}

function BoxCard({ children }) {
  const text = String(children);
  const rawLines = text.split("\n").filter(l => !/^[┌└┘┐├┤─│╰╭╮╯]+$/.test(l.trim()));

  const title = rawLines[0]?.replace(/^[│\s]*💡\s*/, "").replace(/[│\s]*$/, "").trim() || "";
  const impact = rawLines.find(l => l.includes("Impact"))?.replace(/.*Impact:\s*/, "").replace(/[│\s]*$/, "").trim() || "";
  const type = rawLines.find(l => l.includes("Type:"))?.replace(/.*Type:\s*/, "").replace(/[│\s]*$/, "").trim() || "";

  const currentIdx = rawLines.findIndex(l => l.includes("❌ Current"));
  const betterIdx = rawLines.findIndex(l => l.includes("✅ Better"));
  const whyIdx = rawLines.findIndex(l => l.includes("📖 Why"));

  function cleanCode(lines, start, end) {
    return lines.slice(start, end).map(l => l.replace(/^[│\s]*/, "").replace(/[│\s]*$/, "")).join("\n").trim();
  }

  const currentCode = currentIdx >= 0 && betterIdx >= 0 ? cleanCode(rawLines, currentIdx + 1, betterIdx) : "";
  const betterCode = betterIdx >= 0 ? cleanCode(rawLines, betterIdx + 1, whyIdx >= 0 ? whyIdx : undefined) : "";
  const why = whyIdx >= 0 ? rawLines.slice(whyIdx).map(l => l.replace(/^[│\s]*📖 Why:\s*/, "").replace(/[│\s]*$/, "")).join(" ").trim() : "";

  const impactColor = impact.includes("High") ? "text-red-400" : impact.includes("Medium") ? "text-yellow-400" : "text-emerald-400";

  if (!title && !currentCode && !betterCode) return null;

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] my-3 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-gray-200">{title || "Suggestion"}</span>
          {impact && <span className={`text-xs font-medium shrink-0 ${impactColor}`}>{impact}</span>}
        </div>
        {type && <span className="text-xs text-gray-500 mt-1 inline-block">{type}</span>}
      </div>
      {currentCode && (
        <div className="px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-xs">❌</span>
            <span className="text-xs font-medium text-red-300">Current</span>
          </div>
          <CodeBlock>{currentCode}</CodeBlock>
        </div>
      )}
      {betterCode && (
        <div className="px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-xs">✅</span>
            <span className="text-xs font-medium text-emerald-300">Better</span>
          </div>
          <CodeBlock>{betterCode}</CodeBlock>
        </div>
      )}
      {why && (
        <div className="px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-xs">📖</span>
            <span className="text-xs font-medium text-gray-400">Why</span>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">{why}</p>
        </div>
      )}
    </div>
  );
}

function isBoxStart(line) {
  return /^[┌╭]/.test(line.trim());
}

function isBoxEnd(line) {
  return /^[└╰┘╯]/.test(line.trim());
}

function processSuggestionBody(body) {
  const lines = body.split("\n");
  const result = [];
  let i = 0;
  while (i < lines.length) {
    if (isBoxStart(lines[i])) {
      const boxLines = [];
      boxLines.push(lines[i]);
      i++;
      while (i < lines.length && !isBoxEnd(lines[i])) {
        boxLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) {
        boxLines.push(lines[i]);
        i++;
      }
      const content = boxLines.join("\n");
      if (content.replace(/[┌└┘┐├┤─│╰╭╮╯\s]/g, "").trim()) {
        result.push({ type: "box", content });
      }
    } else if (lines[i].trim() || (result.length > 0 && result[result.length - 1].type === "text")) {
      const textLines = [];
      while (i < lines.length && !isBoxStart(lines[i])) {
        textLines.push(lines[i]);
        i++;
      }
      const content = textLines.join("\n").trim();
      if (content) {
        result.push({ type: "text", content });
      }
    } else {
      i++;
    }
  }
  return result;
}

function markdownComponents(isSmall) {
  const shared = {
    p({ children }) { return <p className="text-sm text-gray-400 leading-relaxed my-2">{children}</p>; },
    hr() { return <hr className="border-white/5 my-3" />; },
    code({ inline, children }) { return <code className="bg-white/5 px-1.5 py-0.5 rounded text-sm font-mono text-gray-300">{children}</code>; },
    pre({ children }) { const c = children?.[0]; const code = c?.props?.children?.[0] || ""; return <CodeBlock>{code}</CodeBlock>; },
    ul({ children }) { return <ul className={`${isSmall ? "space-y-1 my-2" : "space-y-1.5 my-2"} list-none pl-0`}>{children}</ul>; },
    li({ children }) { return <li className="text-sm text-gray-400 flex items-start gap-2 before:content-['•'] before:text-gray-600 before:mr-1">{children}</li>; },
    strong({ children }) { return <strong className="font-semibold text-gray-200">{children}</strong>; },
    em({ children }) { return <em className="text-gray-300 italic">{children}</em>; }
  };
  return shared;
}

function SectionCard({ header, body, hasNext }) {
  const style = getSectionStyle(header);
  const isSuggestionSection = header.toUpperCase().includes("SUGGESTIONS");
  const isCodeSection = header.toUpperCase().includes("INLINE CODE");

  const processedBody = useMemo(() => {
    if (isSuggestionSection) return processSuggestionBody(body);
    return null;
  }, [body, isSuggestionSection]);

  return (
    <div className={`border-l-2 ${style.border} pl-4`}>
      <span className={`inline-block text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${style.badge} mb-3`}>{style.label}</span>
      <div className={isCodeSection ? "" : "prose prose-invert prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"}>
        {isCodeSection ? (
          <CodeBlock showLineNumbers>{body}</CodeBlock>
        ) : isSuggestionSection && processedBody ? (
          <div>
            {processedBody.map((part, i) =>
              part.type === "box" ? <BoxCard key={i}>{part.content}</BoxCard>
                : <ReactMarkdown key={i} components={markdownComponents(true)}>{part.content}</ReactMarkdown>
            )}
          </div>
        ) : (
          <ReactMarkdown components={markdownComponents(false)}>{body}</ReactMarkdown>
        )}
      </div>
      {hasNext && <hr className="border-white/5 my-6" />}
    </div>
  );
}

const STEPS_OCR = [
  { key: "uploading", label: "Uploading Image" },
  { key: "ocr", label: "Running OCR" },
  { key: "validating", label: "Validating Code" }
];

const STEPS_VISION = [
  { key: "uploading", label: "Uploading Image" },
  { key: "validating", label: "AI Vision Analysis" }
];

function ExtractionStepper({ state }) {
  const steps = state.imageMode === "vision" ? STEPS_VISION : STEPS_OCR;
  const order = state.imageMode === "vision" ? ["uploading", "validating"] : ["uploading", "ocr", "validating"];
  const currentIdx = order.indexOf(state.step);

  return (
    <div className="flex flex-col items-center justify-center py-8 px-4">
      <h3 className="text-sm font-semibold text-gray-300 mb-8">Extracting Code from Image</h3>
      <div className="w-full max-w-xs">
        {steps.map((step, i) => {
          const isActive = currentIdx === i;
          const isCompleted = i < currentIdx;
          const isLast = i === steps.length - 1;

          return (
            <div key={step.key} className="relative flex items-start gap-3 pb-1">
              {!isLast && (
                <div className={`absolute left-3.5 top-7 w-0.5 h-7 ${isCompleted ? "bg-emerald-500" : "bg-white/10"}`} />
              )}
              <div className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-500 ${
                isCompleted ? "bg-emerald-500 text-gray-950" :
                isActive ? "bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/30" :
                "bg-white/5 text-gray-600"
              }`}>
                {isCompleted ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : isActive ? (
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : i + 1}
              </div>
              <div className="pt-0.5">
                <span className={`text-sm transition-colors duration-500 ${
                  isCompleted ? "text-emerald-400" : isActive ? "text-gray-200" : "text-gray-600"
                }`}>{step.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ReviewPanel({ reviewMarkdown, reviewLoading, reviewError, runReview, extractionState, runErrors }) {
  const normalized = useMemo(() => normalizeMarkdown(reviewMarkdown), [reviewMarkdown]);
  const sections = useMemo(() => splitSections(normalized), [normalized]);

  const hasSections = sections.length > 0;
  const hasRunErrors = Array.isArray(runErrors) && runErrors.length > 0;
  const isEmpty = !reviewLoading && !reviewError && !hasSections && !hasRunErrors && !extractionState?.step;

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 lg:px-5 py-3 lg:py-4 border-b border-white/5 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-xs lg:text-sm font-semibold text-gray-200">Code Review</h2>
            <p className="text-xs text-gray-500 mt-0.5 hidden sm:block">Deep analysis of your code</p>
          </div>
          <button
            type="button"
            onClick={() => runReview()}
            disabled={reviewLoading}
            className="px-3 lg:px-4 py-1.5 text-xs font-medium rounded-lg bg-emerald-500 text-gray-950 hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {reviewLoading ? "Reviewing..." : "Review"}
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-3 lg:p-4">
        {extractionState?.step && extractionState.step !== "error" ? (
          <ExtractionStepper state={extractionState} />
        ) : extractionState?.step === "error" ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <div className="flex items-start gap-3">
              <span className="text-lg">⚠️</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-red-300 mb-1">Extraction Failed</p>
                <p className="text-sm text-red-300/80">{extractionState.error}</p>
                <p className="text-xs text-gray-500 mt-3">Upload a different image or type code directly in the editor.</p>
                <div className="mt-3 pt-3 border-t border-red-500/20">
                  <p className="text-xs text-gray-400 mb-2">Try switching extraction mode:</p>
                  <div className="flex items-center gap-2">
                    <ToggleSwitch
                      enabled={extractionState.imageMode === "vision"}
                      onChange={extractionState.onToggleMode}
                      label={extractionState.imageMode === "vision" ? "AI Vision" : "OCR"}
                      size="sm"
                    />
                    <button
                      type="button"
                      onClick={extractionState.onRetry}
                      className="ml-auto text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors font-medium"
                    >
                      Retry Extraction
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : reviewLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center animate-pulse">
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <span className="text-sm text-gray-500">Analyzing your code...</span>
            </div>
          </div>
        ) : reviewError ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <div className="flex items-start gap-3">
              <span className="text-lg">⚠️</span>
              <div>
                <p className="text-sm font-semibold text-red-300 mb-1">Review Error</p>
                <p className="text-sm text-red-300">{reviewError}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="transition-opacity duration-300">
            {hasRunErrors && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 mb-4">
                <div className="flex items-start gap-3">
                  <span className="text-lg">❌</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-red-300 mb-2">Execution Errors</p>
                    <div className="space-y-1.5">
                      {runErrors.map((err, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          {err.line && <span className="shrink-0 px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 font-mono text-[10px] leading-tight">L{err.line}</span>}
                          <span className="text-red-300/80 font-mono">{err.title || err.detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {hasSections ? (
              <div className="space-y-4">
                {sections.map((sec, i) => (
                  <SectionCard key={i} header={sec.header} body={sec.body} hasNext={i < sections.length - 1} />
                ))}
              </div>
            ) : isEmpty ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <div className="w-11 h-11 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                  </svg>
                </div>
                <p className="text-sm text-gray-500 font-medium">No review yet</p>
                <p className="text-xs text-gray-600 mt-1">Click Review Code to analyze your code</p>
              </div>
            ) : (
              <ReactMarkdown components={{
                p({ children }) { return <p className="text-sm text-gray-400 leading-relaxed my-2">{children}</p>; },
                hr() { return <hr className="border-white/5 my-4" />; },
                code({ inline, children }) { return <code className="bg-white/5 px-1.5 py-0.5 rounded text-sm font-mono text-gray-300">{children}</code>; },
                pre({ children }) { const c = children?.[0]; const code = c?.props?.children?.[0] || ""; return <CodeBlock>{code}</CodeBlock>; },
                ul({ children }) { return <ul className="space-y-1 my-2">{children}</ul>; },
                li({ children }) { return <li className="text-sm text-gray-400 flex items-start gap-2 before:content-['•'] before:text-gray-600 before:mr-1">{children}</li>; },
                strong({ children }) { return <strong className="font-semibold text-gray-200">{children}</strong>; },
                em({ children }) { return <em className="text-gray-300 italic">{children}</em>; }
              }}>{normalized}</ReactMarkdown>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
