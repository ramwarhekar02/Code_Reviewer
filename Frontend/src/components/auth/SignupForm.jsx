import { useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";

const requirements = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p) => /[a-z]/.test(p) },
  { label: "One number", test: (p) => /\d/.test(p) },
  { label: "One special character (!@#$%^&*)", test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

export default function SignupForm({ setError }) {
  const { signup } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [touched, setTouched] = useState(false);

  const met = useMemo(() => requirements.map((r) => r.test(password)), [password]);

  const strong = met.every(Boolean);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    setTouched(true);
    if (!name || !email || !password) { setErr("All fields are required"); return; }
    if (!strong) { setErr("Password does not meet the requirements"); return; }
    setLoading(true);
    try {
      await signup(name, email, password);
    } catch (err) {
      setErr(err.response?.data?.message || err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="John Doe"
          className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-emerald-500/30 transition-colors"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-emerald-500/30 transition-colors"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">Password</label>
        <div className="relative">
          <input
            type={show ? "text" : "password"}
            value={password}
            onChange={(e) => { setPassword(e.target.value); setTouched(true); }}
            onBlur={() => setTouched(true)}
            placeholder="Create a strong password"
            className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-2.5 pr-10 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-emerald-500/30 transition-colors"
          />
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
          >
            {show ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
      </div>
      {touched && (
        <ul className="space-y-1">
          {requirements.map((r, i) => (
            <li key={i} className={`flex items-center gap-1.5 text-xs transition-colors ${met[i] ? "text-emerald-400" : "text-gray-500"}`}>
              <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {met[i]
                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  : <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                }
              </svg>
              {r.label}
            </li>
          ))}
        </ul>
      )}
      {err && <p className="text-xs text-red-400">{err}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 text-sm font-semibold rounded-xl bg-emerald-500 text-gray-950 hover:bg-emerald-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Creating account..." : "Create Account"}
      </button>
    </form>
  );
}
