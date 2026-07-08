"use client";

import { useWallet } from "@/hooks/useWallet";

export default function WalletBalance() {
  const { balance, bonusBalance } = useWallet();
  return (
    <div className="flex space-x-4">
      <span>💰 {balance.toFixed(2)}</span>
      {bonusBalance > 0 && <span>🎁 {bonusBalance.toFixed(2)}</span>}
    </div>
  );
}