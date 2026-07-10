"use client";

import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";

export const useGameSocket = (token: string | null) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [multiplier, setMultiplier] = useState(1.0);
  const [roundState, setRoundState] = useState<any>(null);
  const [countdown, setCountdown] = useState(0);
  const multiplierRef = useRef(1.0);

  const newSocket = io(process.env.NEXT_PUBLIC_WS_URL, {
  auth: { token },
  transports: ["websocket"],
  path: "/socket.io/", // if Render uses a proxy, this might be needed
});

  useEffect(() => {
    if (!token) return;
    const newSocket = io(process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3000/game", {
      auth: { token },
      transports: ["websocket"],
    });
    setSocket(newSocket);

    newSocket.on("multiplierUpdate", (data: any) => {
      const val = data.multiplier;
      setMultiplier(val);
      multiplierRef.current = val;
    });

    newSocket.on("roundState", (data: any) => {
      setRoundState(data);
    });

    newSocket.on("countdown", (data: any) => {
      setCountdown(data.seconds);
    });

    newSocket.on("roundEnded", (data: any) => {
      setMultiplier(data.multiplier);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [token]);

  return { socket, multiplier, roundState, countdown };
};