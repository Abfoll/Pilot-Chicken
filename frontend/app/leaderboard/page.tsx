"use client";

import Layout from "@/components/Layout";
import { useEffect, useState } from "react";
import { getLeaderboard } from "@/utils/api";

interface LeaderboardEntry {
  userId: number;
  username: string;
  totalWon: number;
  bets: number;
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getLeaderboard();
        setEntries(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error(error);
        setEntries([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold mb-4">🏆 Leaderboard</h2>
        {loading ? (
          <div className="text-center text-gray-400">Loading...</div>
        ) : (
          <div className="bg-gray-800 rounded-xl p-4">
            {entries.length === 0 ? (
              <div className="text-gray-500">No data yet</div>
            ) : (
              <div className="space-y-2">
                {entries.map((entry, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between border-b border-gray-700 py-2"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-xl font-bold text-gray-400">
                        #{idx + 1}
                      </span>
                      <span>{entry.username}</span>
                    </div>
                    <div>
                      <span className="text-green-400 font-bold">
                        {entry.totalWon.toFixed(2)}
                      </span>
                      <span className="text-xs text-gray-400 ml-2">
                        {entry.bets} bets
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}