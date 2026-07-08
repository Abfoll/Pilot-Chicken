"use client";

import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { useGame } from "@/context/GameContext";
import { useWallet } from "@/context/WalletContext";
import { toast } from "react-hot-toast";
import ChickenAnimation from "@/components/ChickenAnimation";
import BetControls from "@/components/BetControls";
import MultiplierDisplay from "@/components/MultiplierDisplay";
import CountdownTimer from "@/components/CountdownTimer";
import LivePlayerFeed from "@/components/LivePlayerFeed";
import RoundHistory from "@/components/RoundHistory";

export default function GamePage() {
  const { multiplier, roundStatus, countdown, placeBet, cashOut, betId } = useGame();
  const { balance, refreshWallet } = useWallet();
  const [wager, setWager] = useState(10);
  const [autoCashOut, setAutoCashOut] = useState(2.0);

  // Auto-cashout
  useEffect(() => {
    if (betId && autoCashOut && multiplier >= autoCashOut && roundStatus === "active") {
      cashOut();
      toast.success(`Auto cashed out at ${multiplier.toFixed(2)}x!`);
    }
  }, [multiplier, autoCashOut, betId, roundStatus]);

  const handlePlaceBet = async () => {
    if (wager > balance) {
      toast.error("Insufficient balance");
      return;
    }
    placeBet(wager, autoCashOut);
    toast.success(`Bet placed: ${wager} at ${autoCashOut}x auto`);
  };

  const handleCashOut = () => {
    if (betId) {
      cashOut();
      toast.success(`Cashed out at ${multiplier.toFixed(2)}x!`);
      refreshWallet();
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <div className="bg-gray-800 rounded-2xl p-6 shadow-2xl">
          <div className="relative h-48 mb-4">
            <ChickenAnimation multiplier={multiplier} isFlying={roundStatus === "active"} />
          </div>

          <MultiplierDisplay multiplier={multiplier} status={roundStatus} />

          {roundStatus === "countdown" && <CountdownTimer seconds={countdown} />}

          {roundStatus !== "active" && roundStatus !== "countdown" && (
            <BetControls
              wager={wager}
              setWager={setWager}
              autoCashOut={autoCashOut}
              setAutoCashOut={setAutoCashOut}
              onPlaceBet={handlePlaceBet}
              disabled={roundStatus !== "idle"}
            />
          )}

          {roundStatus === "active" && betId && (
            <button
              onClick={handleCashOut}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl text-2xl transition"
            >
              🚀 CASH OUT NOW
            </button>
          )}

          {roundStatus === "active" && !betId && (
            <div className="text-center text-yellow-400">Place a bet to participate!</div>
          )}

          <div className="mt-6">
            <LivePlayerFeed />
          </div>
        </div>

        <div className="mt-6">
          <RoundHistory />
        </div>
      </div>
    </Layout>
  );
}