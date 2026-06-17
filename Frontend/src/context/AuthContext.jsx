import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api, { fetchCsrfToken } from "../utils/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "dark";
  });

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem("theme", next);
      return next;
    });
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const checkAuth = useCallback(async () => {
    try {
      const { data } = await api.get("/api/auth/me");
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCsrfToken();
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    function handleForceLogout() {
      setUser(null);
      navigate("/auth");
    }
    window.addEventListener("auth:logout", handleForceLogout);
    return () => window.removeEventListener("auth:logout", handleForceLogout);
  }, [navigate]);

  const login = async (email, password) => {
    const { data } = await api.post("/api/auth/login", { email, password });
    setUser(data.user);
    navigate("/review", { replace: true });
    return data;
  };

  const signup = async (name, email, password) => {
    const { data } = await api.post("/api/auth/register", { name, email, password });
    setUser(data.user);
    navigate("/review", { replace: true });
    return data;
  };

  const googleLogin = async (code) => {
    const { data } = await api.post("/api/auth/google", { code });
    setUser(data.user);
    navigate("/review", { replace: true });
    return data;
  };

  const logout = async () => {
    await api.post("/api/auth/logout");
    setUser(null);
    navigate("/");
  };

  return (
    <AuthContext.Provider value={{ user, loading, theme, toggleTheme, login, signup, googleLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
