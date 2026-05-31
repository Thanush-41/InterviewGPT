"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface User {
  id: string;
  email: string;
  name: string;
  role: "recruiter" | "candidate";
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, role: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("interviewgpt_auth");
    if (stored) {
      try {
        const { token, user } = JSON.parse(stored);
        setToken(token);
        setUser(user);
      } catch {}
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Login failed" }));
      throw new Error(err.detail || "Invalid credentials");
    }
    const data = await res.json();
    setToken(data.access_token);
    setUser(data.user);
    localStorage.setItem("interviewgpt_auth", JSON.stringify({ token: data.access_token, user: data.user }));
  };

  const signup = async (email: string, password: string, name: string, role: string) => {
    const res = await fetch(`${API_URL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name, role }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Signup failed" }));
      throw new Error(err.detail || "Registration failed");
    }
    const data = await res.json();
    setToken(data.access_token);
    setUser(data.user);
    localStorage.setItem("interviewgpt_auth", JSON.stringify({ token: data.access_token, user: data.user }));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("interviewgpt_auth");
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
