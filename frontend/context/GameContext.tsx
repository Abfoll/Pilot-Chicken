"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useGameSocket } from "@/hooks/useGameSocket";
import { useAuth } from "@/context/AuthContext";
import { Socket } from "socket.io-client";

interface GameContextType {
  socket: Socket | null;
  currentRound: any;
  multiplier: number;
  roundStatus: "idle" | "countdown" | "active" | "ended" | "completed";
  countdown: number;
  placeBet: (
    wager: number,
    autoCashOut?: number,
    walletType?: string,
  ) => Promise<{ success: boolean; message?: string; betId?: any }>;
  cashOut: () => Promise<{
    success: boolean;
    message?: string;
    multiplier?: number;
    payout?: number;
  }>;
  betId: string | number | null;
  setBetId: (id: string | number | null) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const { token } = useAuth();
  const { socket, multiplier, roundState, countdown } = useGameSocket(token);
  const [betId, setBetId] = useState<string | number | null>(null);
  const [roundStatus, setRoundStatus] = useState<
    "idle" | "countdown" | "active" | "ended" | "completed"
  >("idle");

  // ---- Update roundStatus from socket state ----
  useEffect(() => {
    if (roundState) {
      console.log("🔄 GameContext: roundState updated", roundState);
      const normalizedStatus =
        roundState.status === "pending" ? "countdown" : roundState.status;
      setRoundStatus(normalizedStatus);
      if (normalizedStatus === "completed" || normalizedStatus === "ended") {
        setBetId(null);
      }
    }
  }, [roundState]);

  // Synchronize status when countdown arrives
  useEffect(() => {
    if (countdown > 0 && roundStatus !== "active") {
      setRoundStatus("countdown");
    }
  }, [countdown, roundStatus]);

  // ---- placeBet ----
  const placeBet = (
    wager: number,
    autoCashOut?: number,
    walletType?: string,
  ): Promise<{ success: boolean; message?: string; betId?: any }> => {
    return new Promise((resolve) => {
      if (!socket) {
        resolve({ success: false, message: "Socket not connected" });
        return;
      }
      socket.emit("placeBet", { wager, autoCashOut, walletType }, (response: any) => {
        if (response?.success) {
          setBetId(response.betId);
          resolve(response);
        } else {
          console.error("Place bet failed:", response?.message);
          resolve(response || { success: false, message: "Place bet failed" });
        }
      });
    });
  };

  // ---- cashOut ----
  const cashOut = (): Promise<{
    success: boolean;
    message?: string;
    multiplier?: number;
    payout?: number;
  }> => {
    return new Promise((resolve) => {
      if (!socket || !betId) {
        resolve({ success: false, message: "No active bet" });
        return;
      }
      socket.emit("cashOut", { betId }, (response: any) => {
        if (response?.success) {
          setBetId(null);
          resolve(response);
        } else {
          console.error("Cash out failed:", response?.message);
          resolve(response || { success: false, message: "Cash out failed" });
        }
      });
    });
  };

  return (
    <GameContext.Provider
      value={{
        socket,
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