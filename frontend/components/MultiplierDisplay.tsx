"use client";

interface Props {
  multiplier: number;
  status: string;
}

export default function MultiplierDisplay({ multiplier, status }: Props) {
  const color =
    status === "active"
      ? multiplier > 5
        ? "text-red-500"
        : multiplier > 2
        ? "text-yellow-400"
        : "text-green-400"
      : "text-gray-400";

  return (
    <div className="text-center my-4">
      <div className={`text-7xl font-mono font-bold ${color}`}>
        {multiplier.toFixed(2)}x
      </div>
      <div className="text-sm text-gray-400">
        {status === "active"
          ? "🟢 Live"
          : status === "ended"
          ? "🔴 Crashed"
          : "⏳ Waiting"}
      </div>
    </div>
  );
}