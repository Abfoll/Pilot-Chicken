"use client";

import React from "react";
import { ReactNode } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";

type IconName = "home" | "game" | "wallet" | "history" | "trophy" | "globe" | "arrow";

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    home: <><path d="m3 9 9-7 9 7" /><path d="M5 10v10h14V10" /><path d="M9 20v-6h6v6" /></>,
    game: <><rect x="3" y="6" width="18" height="13" rx="3" /><path d="M7 12h4M9 10v4M16 11h.01M18 14h.01" /></>,
    wallet: <><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H20v14H5.5A2.5 2.5 0 0 1 3 16.5z" /><path d="M3 8h17M16 12h4" /></>,
    history: <><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5M12 7v5l3 2" /></>,
    trophy: <><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" /><path d="M7 6H4v2a4 4 0 0 0 4 4M17 6h3v2a4 4 0 0 1-4 4" /></>,
    globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export default function Layout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { balance } = useWallet();
  const [language, setLanguage] = React.useState<"en" | "am">("en");
  const labels = language === "am"
    ? { home: "መነሻ", game: "ጨዋታ", wallet: "ዋሌት", history: "ታሪክ", leaderboard: "ደረጃ" }
    : { home: "Home", game: "Play", wallet: "Wallet", history: "History", leaderboard: "Ranks" };

  return (
    <div className="app-shell min-h-screen text-white">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#07131d]/85 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#c9f36b] text-sm font-black text-[#07131d]">CR</span>
          <span className="text-lg font-extrabold tracking-tight">Chicken <span className="text-[#c9f36b]">Road</span></span>
        </Link>
        <div className="flex items-center gap-2.5">
          <button onClick={() => setLanguage(language === "en" ? "am" : "en")} className="flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1.5 text-xs font-semibold text-[#91aeb8] transition hover:border-[#66e3ea]/50 hover:text-white" aria-label="Change language">
            <Icon name="globe" size={14} /> {language === "en" ? "አማ" : "EN"}
          </button>
          <span className="rounded-full border border-[#c9f36b]/20 bg-[#c9f36b]/10 px-3 py-1.5 text-sm font-bold text-[#c9f36b]">
            {balance.toFixed(2)} CR
          </span>
          {user && (
            <div className="hidden items-center gap-2 sm:flex">
              <img
                src={user.photoUrl}
                alt="avatar"
                className="h-8 w-8 rounded-full border border-white/20"
              />
              <span className="text-sm text-[#d7e8eb]">{user.username}</span>
            </div>
          )}
        </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-4 pb-28 sm:p-6 sm:pb-28">{children}</main>
      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-[#0b1c29]/95 px-2 py-2 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg justify-around">
        {([
          ["/", "home", labels.home],
          ["/game", "game", labels.game],
          ["/wallet", "wallet", labels.wallet],
          ["/history", "history", labels.history],
          ["/leaderboard", "trophy", labels.leaderboard],
        ] as [string, IconName, string][]).map(([href, icon, label]) => (
          <Link key={href} href={href} className="flex min-w-[54px] flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-semibold text-[#91aeb8] transition hover:bg-white/5 hover:text-[#c9f36b]">
            <Icon name={icon} />
            {label}
          </Link>
        ))}
        </div>
      </nav>
    </div>
  );
}