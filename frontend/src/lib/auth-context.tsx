"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { getMe, loginUser, signupUser, User } from "./api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user profile if token is in sessionStorage
  useEffect(() => {
    async function loadUser() {
      // CLEAR localStorage just in case they have an old lingering token
      localStorage.removeItem("spotlight_token");
      
      const storedToken = sessionStorage.getItem("spotlight_token");
      if (storedToken) {
        setToken(storedToken);
        try {
          const profile = await getMe();
          setUser(profile);
        } catch (error: unknown) {
          console.error("Failed to load user profile:", error);
          const err = error as { status?: number; message?: string };
          // Only clear stored token if the backend explicitly returned a 401 Unauthorized response
          if (err?.status === 401 || err?.message?.includes("401") || err?.message?.includes("Unauthorized")) {
            sessionStorage.removeItem("spotlight_token");
            setToken(null);
            setUser(null);
          }
        }
      }
      setLoading(false);
    }
    loadUser();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const res = await loginUser({ username, password });
      sessionStorage.setItem("spotlight_token", res.access_token);
      setToken(res.access_token);
      setUser(res.user);
    } catch (error) {
      throw error;
    }
  };

  const signup = async (username: string, password: string) => {
    try {
      const res = await signupUser({ username, password });
      sessionStorage.setItem("spotlight_token", res.access_token);
      setToken(res.access_token);
      setUser(res.user);
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    sessionStorage.removeItem("spotlight_token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
