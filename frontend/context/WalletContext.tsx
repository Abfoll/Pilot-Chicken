"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getWallet } from "@/utils/api";
import { useAuth } from "@/context/AuthContext";

interface WalletContextType {
  balance: number;
  bonusBalance: number;
  refreshWallet: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const { token } = useAuth();
  const [balance, setBalance] = useState(0);
  const [bonusBalance, setBonusBalance] = useState(0);

  const refreshWallet = async () => {
    if (!token) return;
    try {
      const data = await getWallet(token);
      setBalance(data.balance);
      setBonusBalance(data.bonusBalance || 0);
    } catch (error) {
      console.error("Failed to fetch wallet", error);
    }
  };

  useEffect(() => {
    if (token) refreshWallet();
  }, [token]);

  return (
    <WalletContext.Provider value={{ balance, bonusBalance, refreshWallet }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
};