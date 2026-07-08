"use client";

import { useEffect, ReactNode } from "react";

export const TelegramProvider = ({ children }: { children: ReactNode }) => {
  useEffect(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      // Optionally apply theme colors
      document.documentElement.style.setProperty(
        "--tg-theme-bg-color",
        tg.themeParams.bg_color || "#1f2937"
      );
      document.documentElement.style.setProperty(
        "--tg-theme-text-color",
        tg.themeParams.text_color || "#ffffff"
      );
      document.documentElement.style.setProperty(
        "--tg-theme-button-color",
        tg.themeParams.button_color || "#3b82f6"
      );
      document.documentElement.style.setProperty(
        "--tg-theme-button-text-color",
        tg.themeParams.button_text_color || "#ffffff"
      );
    }
  }, []);

  return <>{children}</>;
};