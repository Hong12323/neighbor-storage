import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiRequest, getApiUrl, queryClient } from "@/lib/query-client";

interface AuthUser {
  id: string;
  email: string;
  nickname: string;
  avatarUrl: string | null;
  balance: number;
  trustScore: number;
  isAdmin: boolean;
  isBanned: boolean;
  isShopOwner: boolean;
  shopName: string | null;
  location: string | null;
  bio: string | null;
  createdAt: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, nickname: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  signup: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const baseUrl = getApiUrl();
      const res = await fetch(new URL("/api/auth/me", baseUrl).toString(), {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const res = await apiRequest("POST", "/api/auth/login", { email, password });
    const data = await res.json();
    setUser(data);
    queryClient.invalidateQueries();
  };

  const signup = async (email: string, password: string, nickname: string) => {
    const res = await apiRequest("POST", "/api/auth/signup", {
      email,
      password,
      nickname,
    });
    const data = await res.json();
    setUser(data);
    queryClient.invalidateQueries();
  };

  const logout = async () => {
    await apiRequest("POST", "/api/auth/logout");
    setUser(null);
    queryClient.clear();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
