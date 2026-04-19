import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    api.me().then(setUser).catch(() => localStorage.removeItem("token")).finally(() => setLoading(false));
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      async login(payload) {
        const data = await api.login(payload);
        localStorage.setItem("token", data.token);
        setUser(data.user);
      },
      async register(payload) {
        const data = await api.register(payload);
        localStorage.setItem("token", data.token);
        setUser(data.user);
      },
      async updateProfile(payload) {
        const data = await api.updateProfile(payload);
        setUser(data);
      },
      logout() {
        localStorage.removeItem("token");
        setUser(null);
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used in AuthProvider");
  return ctx;
}
