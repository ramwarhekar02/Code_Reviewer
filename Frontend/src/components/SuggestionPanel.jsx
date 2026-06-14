import { useMemo } from "react";

const SEVERITY_CONFIG = {
  error: { border: "border-l-red-500/60", ring: "ring-red-500/20", badge: "bg-red-500/10 text-red-400", bar: "bg-red-500", icon: "❌", label: "Must Fix" },
  warning: { border: "border-l-amber-500/60", ring: "ring-amber-500/20", badge: "bg-amber-500/10 text-amber-400", bar: "bg-amber-500", icon: "⚠️", label: "Warning" },
  info: { border: "border-l-sky-500/60", ring: "ring-sky-500/20", badge: "bg-sky-500/10 text-sky-400", bar: "bg-sky-500", icon: "💡", label: "Suggestion" }
};

const TYPE_COLORS = {
  syntax: "text-red-400",
  logic: "text-amber-400",
  performance: "text-purple-400",
  style: "text-sky-400",
  improvement: "text-emerald-400"
};

function getSeverity(s) {
  return SEVERITY_CONFIG[s] || SEVERITY_CONFIG.info;
}

function countBySeverity(items) {
  const counts = {};
  items.forEach((item) => {
    const key = item.severity || "info";
    counts[key] = (counts[key] || 0) + 1;
  });
  return counts;
}

function SeverityBar({ items }) {
  const counts = useMemo(() => countBySeverity(items), [items]);
  const order = ["error", "warning", "info"];
  const total = items.length;
  if (total === 0) return null;

  return (
    <div className="flex gap-3 px-1">
      {order.map((key) => {
        const count = counts[key] || 0;
        if (count === 0) return null;
        const cfg = SEVERITY_CONFIG[key];
        const pct = Math.round((count / total) * 100);
        return (
          <div key={key} className="flex items-center gap-1.5 text-xs">
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.bar}`} />
            <span className="text-gray-500">{cfg.icon}</span>
            <span className={`font-medium ${cfg.badge.split(" ")[1]}`}>{count}</span>
            <span className="text-gray-600">({pct}%)</span>
          </div>
        );
      })}
    </div>
  );
}

export default function SuggestionPanel({ suggestionsData, suggestionsLoading, applySuggestion }) {
  const items = suggestionsData.items || [];

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b border-white/5 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-200">Suggestions</h2>
          {suggestionsLoading && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-medium inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Analyzing
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mb-2.5 leading-relaxed">{suggestionsData.summary}</p>
        <SeverityBar items={items} />
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-3">
        {items.length === 0 && !suggestionsLoading ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="w-11 h-11 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
              </svg>
            </div>
            <p className="text-sm text-gray-500 font-medium">No suggestions yet</p>
            <p className="text-xs text-gray-600 mt-1">Write some code to get live suggestions</p>
          </div>
        ) : (
          items.map((item, index) => {
            const sev = getSeverity(item.severity);
            const typeColor = TYPE_COLORS[item.type] || "text-gray-400";
            return (
              <div
                key={`${item.title}-${item.line}-${index}`}
                className={`rounded-xl border border-white/5 bg-white/[0.03] border-l-2 ${sev.border} p-4 space-y-3 transition-colors hover:bg-white/[0.05]`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full font-medium ${sev.badge} inline-flex items-center gap-1`}>
                      {sev.icon} {sev.label}
                    </span>
                    {item.line && (
                      <span className="px-1.5 py-0.5 rounded bg-white/[0.03] border border-white/5 text-gray-500 font-mono text-[11px]">
                        Ln {item.line}
                      </span>
                    )}
                    <span className={`capitalize font-medium ${typeColor}`}>{item.type || "improvement"}</span>
                  </div>
                  {item.replacement ? (
                    <button
                      type="button"
                      onClick={() => applySuggestion(item)}
                      className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40 transition-all font-medium"
                    >
                      Apply Fix
                    </button>
                  ) : null}
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-200 mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{item.detail}</p>
                </div>

                <div className={`rounded-lg border-l-2 ${sev.border} bg-white/[0.02] border border-white/5 pl-3 p-3`}>
                  <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mb-1">Suggestion</p>
                  <p className="text-sm text-gray-300 leading-relaxed">{item.suggestion}</p>
                  {item.replacement && (
                    <pre className="mt-2 p-2.5 rounded-lg bg-[#1a1a1a] border border-white/5 overflow-x-auto text-sm font-mono text-gray-300 leading-relaxed">
                      {item.replacement}
                    </pre>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}