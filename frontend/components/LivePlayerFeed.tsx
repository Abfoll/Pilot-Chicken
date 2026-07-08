"use client";

import { useEffect, useState } from "react";
import { useGameSocket } from "@/hooks/useGameSocket";
import { useAuth } from "@/hooks/useAuth";

interface Player {
  id: string;
  username: string;
  wager: number;
  cashedOut?: number;
}

export default function LivePlayerFeed() {
  const { token } = useAuth();
  const { socket } = useGameSocket(token);
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    if (!socket) return;

    socket.on("playerJoined", (player: Player) => {
      setPlayers((prev) => [...prev, player]);
    });

    socket.on("playerCashedOut", ({ playerId, multiplier }) => {
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === playerId ? { ...p, cashedOut: multiplier } : p
        )
      );
    });

    socket.on("roundEnded", () => {
      setPlayers([]);
    });

    return () => {
      socket.off("playerJoined");
      socket.off("playerCashedOut");
      socket.off("roundEnded");
    };
  }, [socket]);

  return (
    <div className="bg-gray-700 rounded-xl p-4">
      <h4 className="text-sm font-semibold text-gray-300 mb-2">
        👥 Live Players ({players.length})
      </h4>
      <div className="max-h-40 overflow-y-auto space-y-1">
        {players.map((p) => (
          <div key={p.id} className="flex justify-between text-sm">
            <span>{p.username}</span>
            <span>
              {p.cashedOut ? (
                <span className="text-green-400">💰 {p.cashedOut.toFixed(2)}x</span>
              ) : (
                <span className="text-yellow-400">🎯 {p.wager}</span>
              )}
            </span>
          </div>
        ))}
        {players.length === 0 && (
          <div className="text-gray-500 text-sm">No players yet</div>
        )}
      </div>
    </div>
  );
}