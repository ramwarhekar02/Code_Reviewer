import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import UserMenu from "../components/UserMenu";
import { fetchHistory } from "../services/api";

const LANG_LABELS = { javascript: "JavaScript", java: "Java", python: "Python", cpp: "C++" };

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function codePreview(code) {
  const lines = code.split("\n").filter(Boolean);
  return lines.slice(0, 3).join("\n") + (lines.length > 3 ? "\n..." : "");
}

function reviewPreview(markdown) {
  return markdown.replace(/```[\s\S]*?```/g, "").replace(/^### .+/gm, "").replace(/#{1,3}\s/g, "").replace(/\n{3,}/g, "\n\n").trim().slice(0, 200) + "...";
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await fetchHistory(page);
        setReviews(data.reviews);
        setPages(data.pages);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [page]);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <header className="flex items-center justify-between px-3 lg:px-5 py-2 lg:py-3 border-b border-white/5 bg-gray-950 shrink-0">
        <button
          type="button"
          onClick={() => navigate("/review")}
          className="flex items-center gap-1.5 lg:gap-2 text-gray-400 hover:text-gray-200 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-xs lg:text-sm font-medium hidden sm:inline">CodeReviewer</span>
        </button>
        <div className="flex items-center gap-2 lg:gap-3">
          <span className="text-xs text-gray-500 hidden sm:inline">Review History</span>
          <UserMenu />
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-3 lg:px-4 py-4 lg:py-8">
        <div className="flex items-center justify-between mb-4 lg:mb-6 gap-2">
          <div className="min-w-0">
            <h1 className="text-base lg:text-lg font-semibold text-gray-200">Review History</h1>
            <p className="text-xs lg:text-sm text-gray-500 mt-0.5 lg:mt-1 hidden sm:block">All your past code reviews</p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/review")}
            className="text-xs px-3 lg:px-4 py-1.5 lg:py-2 rounded-lg bg-emerald-500 text-gray-950 font-medium hover:bg-emerald-400 transition-colors shrink-0"
          >
            New Review
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 lg:py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center animate-pulse">
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-sm text-gray-500">Loading history...</span>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 lg:p-4">
            <p className="text-xs lg:text-sm text-red-300">{error}</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 lg:py-20 text-center">
            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center mb-3 lg:mb-4">
              <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <p className="text-sm text-gray-500 font-medium">No reviews yet</p>
            <p className="text-xs text-gray-600 mt-1">Run your first code review to see it here</p>
            <button
              type="button"
              onClick={() => navigate("/review")}
              className="mt-4 text-xs px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors font-medium"
            >
              Go to Editor
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => {
              const isExpanded = expandedId === review._id;
              return (
                <div
                  key={review._id}
                  className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden transition-colors hover:bg-white/[0.04]"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : review._id)}
                    className="w-full text-left p-3 lg:p-4 flex items-start justify-between gap-3 lg:gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 lg:gap-2 mb-1 lg:mb-1.5 flex-wrap">
                        <span className="px-1.5 lg:px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-medium">
                          {LANG_LABELS[review.language] || review.language}
                        </span>
                        <span className="text-xs text-gray-500">{formatDate(review.createdAt)}</span>
                      </div>
                      <pre className="text-xs text-gray-400 font-mono leading-relaxed truncate">{codePreview(review.code)}</pre>
                    </div>
                    <svg
                      className={`w-4 h-4 text-gray-500 shrink-0 mt-1 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-white/5 px-3 lg:px-4 py-3 lg:py-4 space-y-3 lg:space-y-4">
                      <div>
                        <h3 className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5 lg:mb-2">Reviewed Code</h3>
                        <pre className="bg-[#1a1a1a] rounded-lg p-2 lg:p-3 text-xs font-mono text-gray-300 leading-relaxed overflow-x-auto">{review.code}</pre>
                      </div>
                      <div>
                        <h3 className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1.5 lg:mb-2">Review</h3>
                        <div className="bg-[#1a1a1a] rounded-lg p-2 lg:p-3 text-xs text-gray-400 leading-relaxed whitespace-pre-wrap font-mono">
                          {review.markdown.length > 1000 ? review.markdown.slice(0, 1000) + "\n..." : review.markdown}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {pages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-3 lg:pt-4">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="text-xs px-2.5 lg:px-3 py-1.5 rounded-lg border border-white/5 text-gray-400 hover:text-gray-200 hover:border-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-xs text-gray-500">
                  {page} / {pages}
                </span>
                <button
                  type="button"
                  disabled={page >= pages}
                  onClick={() => setPage((p) => p + 1)}
                  className="text-xs px-2.5 lg:px-3 py-1.5 rounded-lg border border-white/5 text-gray-400 hover:text-gray-200 hover:border-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}