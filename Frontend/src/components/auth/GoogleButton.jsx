import { useGoogleLogin } from "@react-oauth/google";
import { useAuth } from "../../context/AuthContext";

export default function GoogleButton({ setError }) {
  const { googleLogin } = useAuth();

  const login = useGoogleLogin({
    flow: "auth-code",
    onSuccess: async (res) => {
      try {
        setError("");
        await googleLogin(res.code);
      } catch (err) {
        setError(err.response?.data?.message || "Google sign-in failed");
      }
    },
    onError: () => setError("Google sign-in failed")
  });

  return (
    <button
      type="button"
      onClick={() => login()}
      className="w-full flex items-center justify-center gap-3 px-4 py-2.5 text-sm font-medium rounded-xl border border-white/10 text-gray-300 hover:bg-white/[0.03] hover:border-white/20 transition-all"
    >
      <svg className="w-5 h-5" viewBox="0 0 48 48">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 019.5 24c0-1.59.28-3.14.76-4.59l-7.98-6.19A23.99 23.99 0 000 24c0 3.77.87 7.35 2.56 10.56l7.97-5.97z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 5.97C6.51 42.62 14.62 48 24 48z" />
      </svg>
      Continue with Google
    </button>
  );
}
