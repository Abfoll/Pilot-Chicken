"use client";

import { useEffect, useState } from "react";

export default function CountdownTimer({ seconds }: { seconds: number }) {
  const [count, setCount] = useState(seconds);

  useEffect(() => {
    setCount(seconds);
  }, [seconds]);

  return (
    <div className="text-center py-4">
      <div className="text-5xl font-mono font-bold text-blue-400">{count}s</div>
      <div className="text-sm text-gray-400">Next round starts in...</div>
    </div>
  );
}