"use client";

interface Props {
  wager: number;
  setWager: (val: number) => void;
  autoCashOut: number;
  setAutoCashOut: (val: number) => void;
  onPlaceBet: () => void;
  disabled: boolean;
}

export default function BetControls({
  wager,
  setWager,
  autoCashOut,
  setAutoCashOut,
  onPlaceBet,
  disabled,
}: Props) {
  const presetWagers = [5, 10, 25, 50, 100];

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Wager
        </label>
        <div className="flex space-x-2">
          {presetWagers.map((val) => (
            <button
              key={val}
              onClick={() => setWager(val)}
              className={`px-3 py-1 rounded-lg text-sm ${
                wager === val ? "bg-blue-600" : "bg-gray-700"
              } hover:bg-blue-500 transition`}
            >
              {val}
            </button>
          ))}
        </div>
        <input
          type="number"
          value={wager}
          onChange={(e) => setWager(Number(e.target.value))}
          className="w-full mt-2 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
          min={0.1}
          step={0.1}
          disabled={disabled}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Auto Cash Out (x)
        </label>
        <input
          type="number"
          value={autoCashOut}
          onChange={(e) => setAutoCashOut(Number(e.target.value))}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
          min={1.01}
          step={0.01}
          disabled={disabled}
        />
      </div>

      <button
        onClick={onPlaceBet}
        disabled={disabled}
        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-3 rounded-xl transition"
      >
        Place Bet
      </button>
    </div>
  );
}