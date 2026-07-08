"use client";

import { useState, useEffect } from "react";

declare global {
  interface Window {
    Telegram: any;
  }
}

export const useTelegram = () => {
  const [initData, setInitData] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      setInitData(tg.initData || "");
    }
  }, []);

  return { initData };
};