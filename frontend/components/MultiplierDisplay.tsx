"use client";

interface Props {
  multiplier: number;
  status: string;
  roundNumber?: number | string;
  roundHash?: string;
}

export default function MultiplierDisplay({ multiplier, status, roundNumber, roundHash }: Props) {
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
      <div className="text-sm text-gray-400 flex justify-center items-center gap-4 mt-1">
        <span>
          {status === "active"
            ? "🟢 Live"
            : status === "ended"
            ? "🔴 Crashed"
            : "⏳ Waiting"}
        </span>
        {roundNumber && (
          <span className="bg-gray-700 px-2 py-0.5 rounded text-xs">
            Round #{roundNumber}
          </span>
        )}
        {roundHash && (
          <span className="bg-gray-700 px-2 py-0.5 rounded text-xs font-mono">
            {roundHash}
          </span>
        )}
      </div>
    </div>
  );
}