import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import UserMenu from "../components/UserMenu";

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <header className="px-6 py-4 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>
          <span className="text-lg font-semibold text-gray-100">CodeReviewer</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(user ? "/review" : "/auth")}
            className="px-5 py-2 text-sm font-medium rounded-xl bg-emerald-500 text-gray-950 hover:bg-emerald-400 transition-all hover:shadow-lg hover:shadow-emerald-500/25"
          >
            {user ? "Review Code" : "Get Started"}
          </button>
          {user && <UserMenu />}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/5 text-xs text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            AI-Powered Code Analysis
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-100 leading-tight tracking-tight">
            Smart Code Reviews
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-sky-400">
              Powered by AI
            </span>
          </h1>

          <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Get instant, intelligent feedback on your code. Analyze syntax, logic, performance,
            and complexity — all in real time as you type.
          </p>

          <div className="flex items-center justify-center gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate("/review")}
              className="px-8 py-3.5 text-sm font-semibold rounded-xl bg-emerald-500 text-gray-950 hover:bg-emerald-400 transition-all hover:shadow-lg hover:shadow-emerald-500/25"
            >
              Start Reviewing
            </button>
            <button
              type="button"
              onClick={() => navigate("/review")}
              className="px-8 py-3.5 text-sm font-semibold rounded-xl border border-white/10 text-gray-300 hover:bg-white/[0.03] hover:border-white/20 transition-all"
            >
              Try Demo
            </button>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto w-full">
          {[
            { title: "Live Suggestions", desc: "Real-time AI feedback as you type, with inline code hints and fixes." },
            { title: "Deep Reviews", desc: "Comprehensive analysis of syntax, logic, performance, and time/space complexity." },
            { title: "AI Chat", desc: "Ask questions, get explanations, and request optimizations in natural language." }
          ].map((feature) => (
            <div key={feature.title} className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 text-left hover:border-white/10 transition-colors">
              <h3 className="text-sm font-semibold text-gray-200 mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
