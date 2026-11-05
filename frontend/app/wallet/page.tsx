"use client";

import Layout from "@/components/Layout";
import { useWallet } from "@/context/WalletContext";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import { toast } from "react-hot-toast";

export default function WalletPage() {
  const { balance, bonusBalance, refreshWallet } = useWallet();
  const { token, mockLogin, user } = useAuth();
  const [depositAmount, setDepositAmount] = useState(100);
  const [withdrawAmount, setWithdrawAmount] = useState(50);
  const [loading, setLoading] = useState(false);

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

  const claimDemoMoney = async (type: 'main' | 'bonus') => {
    if (!token) {
      toast.error("You must be logged in first");
      return;
    }
    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/wallet/demo-credit?type=${type}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      if (response.ok) {
        await refreshWallet();
        toast.success(`1,000 demo coins credited to ${type} wallet!`);
      } else if (response.status === 401) {
        toast.error('Session expired. Please login again.');
      } else {
        const err = await response.text();
        toast.error(`Failed: ${err}`);
      }
    } catch (error) {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // ---- NEW: set balance to 100 ----
  const setBalanceTo100 = async () => {
    if (!token) {
      toast.error('Not logged in');
      return;
    }
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/wallet/set-balance?amount=100&type=main`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        await refreshWallet();
        toast.success('Balance set to 100');
      } else {
        toast.error('Failed to set balance');
      }
    } catch {
      toast.error('Error');
    }
  };

  const handleMockLogin = async () => {
    if (mockLogin) {
      await mockLogin();
      if (user) toast.success(`Logged in as ${user.username}`);
      else toast.error('Mock login failed');
    }
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto">
        <h2 className="text-2xl font-bold mb-6">Wallet</h2>

        {!user ? (
          <div className="bg-yellow-800/20 border border-yellow-600 rounded-xl p-4 mb-6 text-center">
            <p className="text-yellow-400 mb-2">Not logged in</p>
            <button
              onClick={handleMockLogin}
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg"
            >
              🔑 Test Login
            </button>
          </div>
        ) : (
          <div className="bg-green-800/20 border border-green-600 rounded-xl p-4 mb-6 text-center">
            <p className="text-green-400">Logged in as {user.username}</p>
          </div>
        )}

        <div className="bg-gray-800 rounded-xl p-6 mb-6">
          <div className="flex justify-between">
            <span className="text-gray-400">Main Balance</span>
            <span className="text-2xl font-bold text-green-400">
              {typeof balance === 'number' ? balance.toFixed(2) : '0.00'}
            </span>
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-gray-400">Bonus Balance</span>
            <span className="text-2xl font-bold text-yellow-400">
              {typeof bonusBalance === 'number' ? bonusBalance.toFixed(2) : '0.00'}
            </span>
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

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => claimDemoMoney('main')}
            disabled={loading || !token}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg transition disabled:opacity-50"
          >
            Claim to Main
          </button>
          <button
            onClick={() => claimDemoMoney('bonus')}
            disabled={loading || !token}
            className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 rounded-lg transition disabled:opacity-50"
          >
            Claim to Bonus
          </button>
        </div>

        {/* ---- NEW: Set balance button ---- */}
        <button
          onClick={setBalanceTo100}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 rounded-lg transition mb-4"
        >
          ⚡ Set Balance to 100
        </button>

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