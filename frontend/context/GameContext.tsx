"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useGameSocket } from "@/hooks/useGameSocket";
import { useAuth } from "@/context/AuthContext";

interface GameContextType {
  currentRound: any;
  multiplier: number;
  roundStatus: "idle" | "countdown" | "active" | "ended";
  countdown: number;
  placeBet: (wager: number, autoCashOut?: number, walletType?: string) => void;
  cashOut: () => void;
  betId: string | null;
  setBetId: (id: string) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const { token } = useAuth();
  const { socket, multiplier, roundState, countdown } = useGameSocket(token);
  const [betId, setBetId] = useState<string | null>(null);
  const [roundStatus, setRoundStatus] = useState<"idle" | "countdown" | "active" | "ended">("idle");
  const [forceActive, setForceActive] = useState(false); // debug

  // ---- Update roundStatus from socket events ----
  useEffect(() => {
    if (roundState) {
      console.log("🔄 GameContext: roundState updated", roundState);
      setRoundStatus(roundState.status);
      // If the round is completed, clear betId
      if (roundState.status === "completed" || roundState.status === "ended") {
        setBetId(null);
      }
    }
  }, [roundState]);

  // ---- DEBUG: force active after 5s if no roundState ----
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!roundState && !forceActive) {
        console.warn("⚠️ No roundState received, forcing active state for debugging");
        setRoundStatus("active");
        setForceActive(true);
        // We don't set multiplier here; it will come from socket or stay 1.0
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [roundState, forceActive]);

  // ---- placeBet ----
  const placeBet = (wager: number, autoCashOut?: number, walletType?: string) => {
    if (!socket) {
      console.error("Socket not connected");
      return;
    }
    socket.emit("placeBet", { wager, autoCashOut, walletType }, (response: any) => {
      if (response.success) {
        setBetId(response.betId);
      } else {
        console.error("Place bet failed:", response.message);
        // Optionally show a toast in the component
      }
    });
  };

  // ---- cashOut ----
  const cashOut = () => {
    if (!socket || !betId) {
      console.error("No socket or betId");
      return;
    }
    socket.emit("cashOut", { betId }, (response: any) => {
      if (response.success) {
        setBetId(null);
      } else {
        console.error("Cash out failed:", response.message);
      }
    });
  };

  return (
    <GameContext.Provider
      value={{
        currentRound: roundState,
        multiplier,
        roundStatus,
        countdown,
        placeBet,
        cashOut,
        betId,
        setBetId,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
};