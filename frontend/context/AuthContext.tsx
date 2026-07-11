"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { loginWithTelegram, getMe } from "@/utils/api";
import { useTelegram } from "@/hooks/useTelegram";

interface AuthContextType {
  user: any;
  token: string | null;
  isLoading: boolean;
  login: () => Promise<void>;
  mockLogin: () => Promise<void>; // 👈 new
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { initData } = useTelegram();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const login = async () => {
    try {
      if (!initData) throw new Error("No initData");
      const { access_token } = await loginWithTelegram(initData);
      setToken(access_token);
      localStorage.setItem("token", access_token);
      const userData = await getMe(access_token);
      setUser(userData);
    } catch (error) {
      console.error("Login failed", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 👇 NEW: mock login for development
  const mockLogin = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/test-login`, {
        method: 'POST',
      });
      if (response.ok) {
        const { access_token } = await response.json();
        setToken(access_token);
        localStorage.setItem("token", access_token);
        const userData = await getMe(access_token);
        setUser(userData);
      } else {
        console.error('Mock login failed');
      }
    } catch (error) {
      console.error('Mock login error', error);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
  };

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      setToken(storedToken);
      getMe(storedToken)
        .then(setUser)
        .catch(() => {
          localStorage.removeItem("token");
          setToken(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  // Auto-login if initData available and no token
  useEffect(() => {
    if (initData && !token && !isLoading) {
      login();
    }
  }, [initData]);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, mockLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};