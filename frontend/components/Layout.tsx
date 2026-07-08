"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";

export default function Layout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { balance } = useWallet();

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 p-4 flex justify-between items-center sticky top-0 z-10 shadow-lg">
        <Link href="/" className="text-2xl font-bold text-yellow-400">
          🐔 Pilot Chicken
        </Link>
        <div className="flex items-center space-x-4">
          <span className="bg-gray-700 px-3 py-1 rounded-full text-sm">
            💰 {balance.toFixed(2)}
          </span>
          {user && (
            <div className="flex items-center space-x-2">
              <img
                src={user.photoUrl}
                alt="avatar"
                className="w-8 h-8 rounded-full"
              />
              <span className="text-sm">{user.username}</span>
            </div>
          )}
        </div>
      </header>
      <main className="container mx-auto p-4 pb-20">{children}</main>
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 flex justify-around py-2">
        <Link
          href="/"
          className="flex flex-col items-center text-xs text-gray-400 hover:text-white"
        >
          <span>🏠</span> Home
        </Link>
        <Link
          href="/game"
          className="flex flex-col items-center text-xs text-gray-400 hover:text-white"
        >
          <span>🎮</span> Game
        </Link>
        <Link
          href="/wallet"
          className="flex flex-col items-center text-xs text-gray-400 hover:text-white"
        >
          <span>💳</span> Wallet
        </Link>
        <Link
          href="/history"
          className="flex flex-col items-center text-xs text-gray-400 hover:text-white"
        >
          <span>📊</span> History
        </Link>
        <Link
          href="/leaderboard"
          className="flex flex-col items-center text-xs text-gray-400 hover:text-white"
        >
          <span>🏆</span> Leaderboard
        </Link>
      </nav>
    </div>
  );
}