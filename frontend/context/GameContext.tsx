"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useGameSocket } from "@/hooks/useGameSocket";
import { useAuth } from "@/context/AuthContext";

interface GameContextType {
  currentRound: any;
  multiplier: number;
  roundStatus: "idle" | "countdown" | "active" | "ended";
  countdown: number;
  placeBet: (wager: number, autoCashOut?: number) => void;
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

  useEffect(() => {
    if (roundState) {
      setRoundStatus(roundState.status);
      if (roundState.status === "completed") {
        setBetId(null);
      }
    }
  }, [roundState]);

  const placeBet = (wager: number, autoCashOut?: number) => {
    if (!socket) return;
    socket.emit("placeBet", { wager, autoCashOut }, (response: any) => {
      if (response.success) {
        setBetId(response.betId);
      }
    });
  };

  const cashOut = () => {
    if (!socket || !betId) return;
    socket.emit("cashOut", { betId }, (response: any) => {
      if (response.success) {
        setBetId(null);
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