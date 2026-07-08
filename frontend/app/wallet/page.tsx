"use client";

import Layout from "@/components/Layout";
import { useWallet } from "@/context/WalletContext";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import { toast } from "react-hot-toast";

export default function WalletPage() {
  const { balance, bonusBalance, refreshWallet } = useWallet();
  const { token } = useAuth();
  const [depositAmount, setDepositAmount] = useState(100);
  const [withdrawAmount, setWithdrawAmount] = useState(50);

  const handleDeposit = async () => {
    toast.success(`Deposit of ${depositAmount} initiated (demo)`);
  };

  const handleWithdraw = async () => {
    if (withdrawAmount > balance) {
      toast.error("Insufficient balance");
      return;
    }
    toast.success(`Withdrawal of ${withdrawAmount} requested (demo)`);
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto">
        <h2 className="text-2xl font-bold mb-6">💰 Wallet</h2>

        <div className="bg-gray-800 rounded-xl p-6 mb-6">
          <div className="flex justify-between">
            <span className="text-gray-400">Main Balance</span>
            <span className="text-2xl font-bold text-green-400">{balance.toFixed(2)}</span>
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-gray-400">Bonus Balance</span>
            <span className="text-2xl font-bold text-yellow-400">{bonusBalance.toFixed(2)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm text-gray-400">Deposit</label>
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(Number(e.target.value))}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
            />
            <button
              onClick={handleDeposit}
              className="w-full mt-2 bg-blue-600 hover:bg-blue-700 py-2 rounded-lg"
            >
              Deposit
            </button>
          </div>
          <div>
            <label className="block text-sm text-gray-400">Withdraw</label>
            <input
              type="number"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(Number(e.target.value))}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
            />
            <button
              onClick={handleWithdraw}
              className="w-full mt-2 bg-red-600 hover:bg-red-700 py-2 rounded-lg"
            >
              Withdraw
            </button>
          </div>
        </div>

        <button
          onClick={refreshWallet}
          className="w-full bg-gray-700 hover:bg-gray-600 py-2 rounded-lg text-sm"
        >
          Refresh Balance
        </button>
      </div>
    </Layout>
  );
}