"use client";

import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <Layout>
        <div className="text-center text-gray-400">Loading profile...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-md mx-auto">
        <div className="bg-gray-800 rounded-xl p-6 text-center">
          <img
            src={user.photoUrl || "/default-avatar.png"}
            alt="avatar"
            className="w-24 h-24 rounded-full mx-auto border-4 border-blue-500"
          />
          <h2 className="text-xl font-bold mt-4">{user.username}</h2>
          <p className="text-gray-400">@{user.telegramId}</p>
          <p className="text-sm text-gray-500 mt-2">Member since ...</p>
        </div>

        <div className="mt-6 bg-gray-800 rounded-xl p-4">
          <h3 className="font-semibold">Statistics</h3>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <p className="text-gray-400 text-xs">Total Bets</p>
              <p className="text-xl font-bold">--</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Total Won</p>
              <p className="text-xl font-bold text-green-400">--</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Total Lost</p>
              <p className="text-xl font-bold text-red-400">--</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Best Multiplier</p>
              <p className="text-xl font-bold text-yellow-400">--</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}