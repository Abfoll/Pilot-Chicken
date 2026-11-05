"use client";

import Layout from "@/components/Layout";
import { useEffect, useState } from "react";
import { getHistory } from "@/utils/api";

export default function HistoryPage() {
  const [rounds, setRounds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getHistory(1);
        setRounds(data.rounds || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold mb-4">Game History</h2>
        {loading ? (
          <div className="text-center text-gray-400">Loading...</div>
        ) : (
          <div className="bg-gray-800 rounded-xl p-4 space-y-2">
            {rounds.length === 0 ? (
              <div className="text-gray-500">No rounds yet</div>
            ) : (
              rounds.map((round, idx) => (
                <div
                  key={idx}
                  className="flex justify-between border-b border-gray-700 py-2"
                >
                  <span className="text-sm">Round #{round.roundNumber || idx + 1}</span>
                  <span
                    className={`font-bold ${
                      round.multiplier > 5
                        ? "text-red-400"
                        : round.multiplier > 2
                        ? "text-yellow-400"
                        : "text-green-400"
                    }`}
                  >
                    {round.multiplier?.toFixed(2)}x
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(round.endedAt).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}