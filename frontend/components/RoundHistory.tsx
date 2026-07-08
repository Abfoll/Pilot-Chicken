"use client";

import { useEffect, useState } from "react";
import { getHistory } from "@/utils/api";

interface Round {
  id: number;
  multiplier: number;
  endedAt: string;
}

export default function RoundHistory() {
  const [history, setHistory] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await getHistory();
        const rounds = Array.isArray(data?.rounds)
          ? data.rounds
          : Array.isArray(data)
          ? data
          : [];

        setHistory(rounds);
      } catch (error) {
        console.error("Failed to fetch history", error);
        setHistory([]);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  if (loading) return <div className="text-center text-gray-400">Loading history...</div>;

  return (
    <div className="bg-gray-800 rounded-xl p-4">
      <h4 className="text-sm font-semibold text-gray-300 mb-2">📜 Recent Rounds</h4>
      <div className="flex flex-wrap gap-2">
        {history.map((round) => (
          <div
            key={round.id}
            className="bg-gray-700 px-3 py-1 rounded-full text-sm"
            style={{
              color:
                round.multiplier > 5
                  ? "#ef4444"
                  : round.multiplier > 2
                  ? "#facc15"
                  : "#4ade80",
            }}
          >
            {round.multiplier.toFixed(2)}x
          </div>
        ))}
        {history.length === 0 && (
          <div className="text-gray-500 text-sm">No rounds yet</div>
        )}
      </div>
    </div>
  );
}