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
        <div className="mx-auto mb-8 max-w-2xl pt-8 sm:pt-14">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-[#66e3ea]">Telegram mini game</p>
          <h2 className="text-5xl font-black tracking-tight sm:text-7xl">Take the <span className="text-[#c9f36b]">road.</span></h2>
          <p className="mx-auto mt-5 max-w-md text-base leading-7 text-[#91aeb8]">Pick your moment, cash out before the crash, and climb the Chicken Road ranks.</p>
        </div>

        <div className="glass-panel dot-grid mb-6 rounded-3xl p-7 sm:p-10">
          <div className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-[#91aeb8]">Current multiplier</div>
          <div className="text-7xl font-black tracking-tight text-[#c9f36b] sm:text-8xl">{multiplier.toFixed(2)}x</div>
          <div className="mt-3 text-sm text-[#91aeb8]">
            {roundStatus === "idle" && "Waiting for the next round"}
            {roundStatus === "countdown" && `Round starts in ${countdown}s`}
            {roundStatus === "active" && <span className="text-[#66e3ea]">Live now · cash out when you’re ready</span>}
            {roundStatus === "ended" && "Round ended"}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link href="/game" className="rounded-2xl bg-[#c9f36b] p-4 font-extrabold text-[#07131d] shadow-[0_12px_30px_rgba(201,243,107,0.12)] transition hover:brightness-110">
            <div className="text-lg">Play now <span aria-hidden="true">→</span></div>
          </Link>
          <Link href="/wallet" className="rounded-2xl border border-white/10 bg-[#122b3b] p-4 font-extrabold text-white transition hover:border-[#66e3ea]/50">
            <div className="text-lg">Wallet</div>
          </Link>
        </div>

        <div className="glass-panel mt-8 rounded-2xl p-5">
          <h3 className="text-left text-xs font-bold uppercase tracking-[0.2em] text-[#91aeb8]">Your snapshot</h3>
          <div className="mt-4 flex justify-around">
            <div>
              <p className="text-xs text-[#91aeb8]">Balance</p>
              <p className="text-xl font-black text-[#c9f36b]">{balance.toFixed(2)} CR</p>
            </div>
            <div>
              <p className="text-xs text-[#91aeb8]">Current round</p>
              <p className="text-xl font-black text-white">#{countdown ? "Active" : "--"}</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
