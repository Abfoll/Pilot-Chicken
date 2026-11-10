"use client";

import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { useGame } from "@/context/GameContext";
import { useWallet } from "@/context/WalletContext";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-hot-toast";
import ChickenAnimation from "@/components/ChickenAnimation";
import MultiplierDisplay from "@/components/MultiplierDisplay";
import MultiplierHistory from "@/components/MultiplierHistory";
import BetControls from "@/components/BetControls";
import CountdownTimer from "@/components/CountdownTimer";
import LivePlayerFeed from "@/components/LivePlayerFeed";

export default function GamePage() {
  const { multiplier, roundStatus, countdown, placeBet, cashOut, betId, currentRound } = useGame();
  const { balance, bonusBalance, refreshWallet } = useWallet();
  const { token, user, mockLogin } = useAuth();
  const [wager, setWager] = useState(10);
  const [autoCashOut, setAutoCashOut] = useState(2.0);
  const [walletType, setWalletType] = useState<"main" | "bonus">("main");
  const [betLocked, setBetLocked] = useState(false);

  // Reset bet lock on round completion or countdown
  useEffect(() => {
    if (roundStatus === "ended" || roundStatus === "completed" || roundStatus === "countdown") {
      if (!betId) {
        setBetLocked(false);
      }
    }
  }, [roundStatus, betId]);

  // Auto-cashout
  useEffect(() => {
    if (betId && autoCashOut && multiplier >= autoCashOut && roundStatus === "active") {
      cashOut().then((res) => {
        if (res.success) {
          toast.success(`Auto cashed out at ${(res.multiplier ?? multiplier).toFixed(2)}x!`);
          refreshWallet();
          setBetLocked(false);
        }
      });
    }
  }, [multiplier, autoCashOut, betId, roundStatus, cashOut, refreshWallet]);

  const handlePlaceBet = async () => {
    if (!token) {
      toast.error("Please login first");
      return;
    }
    const available = walletType === "main" ? balance : bonusBalance;
    if (wager > available) {
      toast.error(`Insufficient ${walletType} balance`);
      return;
    }
    if (betLocked) return;

    setBetLocked(true);
    const res = await placeBet(wager, autoCashOut, walletType);
    if (res.success) {
      toast.success(`Bet placed: ${wager} from ${walletType} wallet`);
      refreshWallet();
    } else {
      toast.error(res.message || "Could not place bet");
      setBetLocked(false);
    }
  };

  const handleCashOut = async () => {
    if (betId) {
      const res = await cashOut();
      if (res.success) {
        toast.success(`Cashed out at ${(res.multiplier ?? multiplier).toFixed(2)}x!`);
        refreshWallet();
        setBetLocked(false);
      } else {
        toast.error(res.message || "Cash out failed");
      }
    }
  };

  const handleLogin = async () => {
    try {
      const loggedInUser = await mockLogin();
      toast.success(`Logged in as ${loggedInUser.username}`);
      window.location.reload();
    } catch (error) {
      console.error("Demo login failed", error);
      toast.error("Could not connect to the game server. Start the backend and try again.");
    }
  };

  const roundNumber = currentRound?.roundNumber ?? '--';
  const roundHash = currentRound?.serverSeedHash?.slice(0, 8) ?? '';

  // ----- If not logged in, show login prompt -----
  if (!user) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto text-center py-20">
          <h2 className="text-3xl font-bold mb-4">🔑 Login Required</h2>
          <p className="text-gray-400 mb-6">You need to log in to play the game.</p>
          <button
            onClick={handleLogin}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl text-lg transition"
          >
            Login with Demo Account
          </button>
          <p className="text-xs text-gray-500 mt-4">
            (Uses test-login – no Telegram required)
          </p>
        </div>
      </Layout>
    );
  }

  // ----- Logged in – show the game -----
  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-800 rounded-2xl p-6 shadow-2xl">
          <div className="relative h-56 mb-4">
            <ChickenAnimation multiplier={multiplier} isFlying={roundStatus === "active"} />
          </div>

          <MultiplierDisplay
            multiplier={multiplier}
            status={roundStatus}
            roundNumber={roundNumber}
            roundHash={roundHash}
          />

          {roundStatus === "countdown" && <CountdownTimer seconds={countdown} />}

          {/* Debug info */}
          <div className="text-xs text-gray-500 text-center mt-2">
            Status: {roundStatus} | Multiplier: {typeof multiplier === 'number' ? multiplier.toFixed(2) : '0.00'}x | Countdown: {countdown}s
          </div>

          {/* Show bet controls during countdown or idle */}
          {(roundStatus === "countdown" || roundStatus === "idle") && (
            <BetControls
              wager={wager}
              setWager={setWager}
              autoCashOut={autoCashOut}
              setAutoCashOut={setAutoCashOut}
              onPlaceBet={handlePlaceBet}
              disabled={betLocked}
              walletType={walletType}
              setWalletType={setWalletType}
              mainBalance={balance}
              bonusBalance={bonusBalance}
            />
          )}

          {roundStatus === "active" && betId && (
            <button
              onClick={handleCashOut}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl text-2xl transition mt-4"
            >
              🚀 CASH OUT NOW
            </button>
          )}

          {roundStatus === "active" && !betId && (
            <div className="text-center py-4 bg-gray-700/50 rounded-xl text-yellow-400 font-medium mt-4">
              Flight in progress — next betting round opens shortly!
            </div>
          )}

          {roundStatus === "ended" && (
            <div className="text-center py-4 bg-gray-700/50 rounded-xl text-gray-300 font-medium mt-4">
              Round crashed! Preparing next round...
            </div>
          )}

          <div className="mt-6">
            <LivePlayerFeed />
          </div>
        </div>

        <div className="mt-4">
          <MultiplierHistory />
        </div>
      </div>
    </Layout>
  );
}