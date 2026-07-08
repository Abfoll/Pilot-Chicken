"use client";

import Layout from "@/components/Layout";
import Link from "next/link";
import { useGame } from "@/context/GameContext";
import { useWallet } from "@/context/WalletContext";

export default function HomePage() {
  const { multiplier, roundStatus, countdown } = useGame();
  const { balance } = useWallet();

  return (
    <Layout>
      <div className="text-center">
        <h2 className="text-4xl font-bold mb-4">🐔 Pilot Chicken</h2>
        <p className="text-gray-400 mb-6">Bet, fly, and cash out before the chicken crashes!</p>

        <div className="bg-gray-800 rounded-xl p-6 mb-6">
          <div className="text-6xl font-mono font-bold text-yellow-400">
            {multiplier.toFixed(2)}x
          </div>
          <div className="mt-2 text-gray-400">
            {roundStatus === "idle" && "Waiting for next round..."}
            {roundStatus === "countdown" && `Round starts in ${countdown}s`}
            {roundStatus === "active" && "🟢 Live! Cash out now!"}
            {roundStatus === "ended" && "🔴 Round ended"}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Link href="/game" className="bg-blue-600 hover:bg-blue-700 p-4 rounded-xl shadow-lg">
            <div className="text-2xl">🎮 Play Now</div>
          </Link>
          <Link href="/wallet" className="bg-green-600 hover:bg-green-700 p-4 rounded-xl shadow-lg">
            <div className="text-2xl">💰 Wallet</div>
          </Link>
        </div>

        <div className="mt-8 bg-gray-800 p-4 rounded-xl">
          <h3 className="text-lg font-semibold">Quick Stats</h3>
          <div className="flex justify-around mt-2">
            <div>
              <p className="text-gray-400 text-xs">Balance</p>
              <p className="text-xl font-bold">{balance.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Current Round</p>
              <p className="text-xl font-bold">#{countdown ? "Active" : "--"}</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}