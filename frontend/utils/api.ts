import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const apiClient = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const loginWithTelegram = async (initData: string) => {
  const { data } = await apiClient.post("/auth/login", { initData });
  return data;
};

export const getMe = async (token: string) => {
  const { data } = await apiClient.get("/user/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const getWallet = async (token: string) => {
  const { data } = await apiClient.get("/wallet", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const getHistory = async (page = 1) => {
  try {
    const { data } = await apiClient.get(`/history?page=${page}`);
    return data;
  } catch {
    const { data } = await apiClient.get(`/round/history?page=${page}`);
    return data;
  }
};

export const getLeaderboard = async () => {
  const { data } = await apiClient.get("/leaderboard");
  return Array.isArray(data)
    ? data
    : Array.isArray(data?.entries)
    ? data.entries
    : Array.isArray(data?.leaderboard)
    ? data.leaderboard
    : [];
};