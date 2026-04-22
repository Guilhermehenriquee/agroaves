import { useEffect, useMemo, useState } from "react";
import { api, registerTokenGetter } from "../api/service.js";
import { AuthContext } from "./auth-context.js";

const STORAGE_KEY = "agroaves.session";
function readStoredSession() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => readStoredSession()?.token ?? null);
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(() => (readStoredSession()?.token ? "booting" : "signed_out"));

  useEffect(() => {
    registerTokenGetter(() => token);
  }, [token]);

  useEffect(() => {
    const session = readStoredSession();
    if (!session?.token) {
      return;
    }

    api
      .me(session.token)
      .then((result) => {
        setUser(result.user);
        setStatus("authenticated");
      })
      .catch(() => {
        localStorage.removeItem(STORAGE_KEY);
        setToken(null);
        setUser(null);
        setStatus("signed_out");
      });
  }, []);

  async function login(username, password) {
    const result = await api.login(username, password);
    setToken(result.token);
    setUser(result.user);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: result.token }));
    setStatus("authenticated");
    return result.user;
  }

  async function logout() {
    try {
      await api.logout();
    } catch {
      // noop
    }

    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setUser(null);
    setStatus("signed_out");
  }

  const value = useMemo(
    () => ({
      token,
      user,
      status,
      isAuthenticated: status === "authenticated",
      login,
      logout,
    }),
    [status, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
