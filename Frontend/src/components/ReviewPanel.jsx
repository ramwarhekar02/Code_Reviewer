import { useState, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";

function normalizeMarkdown(text) {
  if (!text) return text;
  let result = text;
  result = result.replace(/([^\n])```/g, "$1\n```");
  result = result.replace(/```([^\n])/g, "```\n$1");
  result = result.replace(/```\n+```/g, "```\n```");
  result = result.replace(/^([📊⚡🏗️]\D*?\d+\/\d+)\s*\|\s*/gm, "$1\n");
  return result;
}

function splitSections(markdown) {
  const parts = markdown.split(/(?=### )/);
  return parts.map((part) => {
    const m = part.match(/^### (.+)/);
    const header = m ? m[1].trim() : null;
    const body = m ? part.replace(/^### .+\n?/, "") : part;
    return { header, body };
  }).filter((s) => s.body.trim() && s.header);
}

const SECTION_STYLES = {
  "QUALITY SCORE": {
    border: "border-l-emerald-500",
    badge: "bg-emerald-500/10 text-emerald-400",
    label: "Quality Score"
  },
  "INLINE CODE": {
    border: "border-l-sky-500",
    badge: "bg-sky-500/10 text-sky-400",
    label: "Inline Code"
  },
  APPROACH: {
    border: "border-l-blue-500",
    badge: "bg-blue-500/10 text-blue-400",
    label: "Approach"
  },
  COMPLEXITY: {
    border: "border-l-purple-500",
    badge: "bg-purple-500/10 text-purple-400",
    label: "Complexity"
  },
  SUGGESTIONS: {
    border: "border-l-amber-500",
    badge: "bg-amber-500/10 text-amber-400",
    label: "Suggestions"
  },
  "WHAT YOU DID WELL": {
    border: "border-l-emerald-500",
    badge: "bg-emerald-500/10 text-emerald-400",
    label: "Done Well"
  },
  "NEXT STEP": {
    border: "border-l-rose-500",
    badge: "bg-rose-500/10 text-rose-400",
    label: "Next Step"
  }
};

function getSectionStyle(header) {
  for (const [key, style] of Object.entries(SECTION_STYLES)) {
    if (header.toUpperCase().includes(key)) return style;
  }
  return {
    border: "border-l-gray-500",
    badge: "bg-white/5 text-gray-400",
    label: header || "Section"
  };
}

function CodeBlock({ children }) {
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
    <div className="bg-[#1a1a1a] rounded-lg p-3 my-3 overflow-x-auto font-mono text-sm leading-relaxed border border-white/5">
      {lines.map((line, i) => {
        const color = getSymbolColor(line);
        return (
          <div key={i} className={color || "text-gray-300"}>
            {line || "\u00A0"}
          </div>
        );
      })}
    </div>
  );
}

function SectionCard({ header, body, hasNext }) {
  const style = getSectionStyle(header);
  const isCodeSection = header.toUpperCase().includes("INLINE CODE");

  return (
    <div className={`border-l-2 ${style.border} pl-4`}>
      <span className={`inline-block text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${style.badge} mb-3`}>
        {style.label}
      </span>
      <div className={`${isCodeSection ? "" : "prose prose-invert prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"}`}>
        {isCodeSection ? (
          <CodeBlock>{body}</CodeBlock>
        ) : (
          <ReactMarkdown
            components={{
              p({ children }) {
                return <p className="text-sm text-gray-400 leading-relaxed my-2">{children}</p>;
              },
              hr() {
                return <hr className="border-white/5 my-3" />;
              },
              code({ inline, children }) {
                return <code className="bg-white/5 px-1.5 py-0.5 rounded text-sm font-mono text-gray-300">{children}</code>;
              },
              pre({ children }) {
                const child = children?.[0];
                const code = child?.props?.children?.[0] || "";
                return <CodeBlock>{code}</CodeBlock>;
              },
              ul({ children }) {
                return <ul className="space-y-1.5 my-2">{children}</ul>;
              },
              li({ children }) {
                return <li className="text-sm text-gray-400 flex items-start gap-2 before:content-['•'] before:text-gray-600 before:mr-1">{children}</li>;
              },
              strong({ children }) {
                return <strong className="font-semibold text-gray-200">{children}</strong>;
              },
              em({ children }) {
                return <em className="text-gray-300 italic">{children}</em>;
              }
            }}
          >
            {body}
          </ReactMarkdown>
        )}
      </div>
      {hasNext && <hr className="border-white/5 my-6" />}
    </div>
  );
}

export default function ReviewPanel({ reviewMarkdown, reviewLoading, reviewError, runReview }) {
  const [visible, setVisible] = useState(false);
  const normalized = useMemo(() => normalizeMarkdown(reviewMarkdown), [reviewMarkdown]);
  const sections = useMemo(() => splitSections(normalized), [normalized]);

  useEffect(() => {
    if (reviewMarkdown && !reviewLoading) {
      const timer = setTimeout(() => setVisible(true), 50);
      return () => clearTimeout(timer);
    }
    setVisible(false);
  }, [reviewMarkdown, reviewLoading]);

  const hasSections = sections.length > 0;

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b border-white/5 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-200">Code Review</h2>
            <p className="text-xs text-gray-500 mt-0.5">Deep analysis of your code</p>
          </div>
          <button
            type="button"
            onClick={runReview}
            disabled={reviewLoading}
            className="px-4 py-1.5 text-xs font-medium rounded-lg bg-emerald-500 text-gray-950 hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {reviewLoading ? "Reviewing..." : "Review Code"}
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4">
        {reviewLoading ? (
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
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 mb-4">
            <div className="flex items-start gap-3">
              <span className="text-lg">⚠️</span>
              <div>
                <p className="text-sm font-semibold text-red-300 mb-1">Review Error</p>
                <p className="text-sm text-red-300">{reviewError}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className={`transition-opacity duration-500 ${visible ? "opacity-100" : "opacity-0"}`}>
            {hasSections ? (
              sections.map((sec, i) => (
                <SectionCard key={i} header={sec.header} body={sec.body} hasNext={i < sections.length - 1} />
              ))
            ) : (
              <ReactMarkdown
                components={{
                  p({ children }) {
                    return <p className="text-sm text-gray-400 leading-relaxed my-2">{children}</p>;
                  },
                  hr() {
                    return <hr className="border-white/5 my-4" />;
                  },
                  code({ inline, children }) {
                    return <code className="bg-white/5 px-1.5 py-0.5 rounded text-sm font-mono text-gray-300">{children}</code>;
                  },
                  pre({ children }) {
                    const child = children?.[0];
                    const code = child?.props?.children?.[0] || "";
                    return <CodeBlock>{code}</CodeBlock>;
                  },
                  ul({ children }) {
                    return <ul className="space-y-1 my-2">{children}</ul>;
                  },
                  li({ children }) {
                    return <li className="text-sm text-gray-400 flex items-start gap-2 before:content-['•'] before:text-gray-600 before:mr-1">{children}</li>;
                  },
                  strong({ children }) {
                    return <strong className="font-semibold text-gray-200">{children}</strong>;
                  },
                  em({ children }) {
                    return <em className="text-gray-300 italic">{children}</em>;
                  }
                }}
              >
                {normalized}
              </ReactMarkdown>
            )}
          </div>
        )}
      </div>
    </div>
  );
}