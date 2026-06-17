import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { useAuth } from "../context/AuthContext";
import LoginForm from "../components/auth/LoginForm";
import SignupForm from "../components/auth/SignupForm";
import GoogleButton from "../components/auth/GoogleButton";

export default function AuthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) navigate("/review", { replace: true });
  }, [user, navigate]);

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <div className="min-h-screen bg-gray-950 flex flex-col">
        <header className="px-4 lg:px-6 py-3 lg:py-4 flex items-center max-w-7xl mx-auto w-full">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 lg:gap-2 text-gray-400 hover:text-gray-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-xs lg:text-sm font-medium hidden sm:inline">CodeReviewer</span>
          </button>
        </header>

        <main className="flex-1 flex items-center justify-center px-3 lg:px-4">
          <div className="w-full max-w-md">
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl p-5 lg:p-8">
              <div className="text-center mb-5 lg:mb-8">
                <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-emerald-500 flex items-center justify-center mx-auto mb-3 lg:mb-4">
                  <svg className="w-7 h-7 text-gray-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <h1 className="text-xl font-bold text-gray-100">
                  {isLogin ? "Welcome back" : "Create account"}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  {isLogin ? "Sign in to continue coding" : "Start your code review journey"}
                </p>
              </div>

              {isLogin ? <LoginForm setError={setError} /> : <SignupForm setError={setError} />}

              {error && (
                <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <p className="text-xs text-red-400 text-center">{error}</p>
                </div>
              )}

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/5" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-gray-950 px-3 text-gray-500">or continue with</span>
                </div>
              </div>

              <GoogleButton setError={setError} />

              <p className="text-center text-xs text-gray-500 mt-6">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button
                  type="button"
                  onClick={() => { setIsLogin(!isLogin); setError(""); }}
                  className="text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
                >
                  {isLogin ? "Sign up" : "Sign in"}
                </button>
              </p>
            </div>
          </div>
        </main>
      </div>
    </GoogleOAuthProvider>
  );
}
