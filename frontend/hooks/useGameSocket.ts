"use client";

import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";

export const useGameSocket = (token: string | null) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [multiplier, setMultiplier] = useState(1.0);
  const [roundState, setRoundState] = useState<any>(null);
  const [countdown, setCountdown] = useState(0);
  const multiplierRef = useRef(1.0);

  useEffect(() => {
    if (!token) {
      console.log("⛔ No token, skipping WebSocket connection");
      return;
    }

    console.log("🔑 Token:", token.substring(0, 20) + "...");
    const baseUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001";
    // 👇 Connect to the '/game' namespace explicitly
    const url = `${baseUrl}/game`;
    console.log(`🔌 Connecting to WebSocket: ${url}`);

    const newSocket = io(url, {
      transports: ["websocket"],
      auth: { token },
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    newSocket.on("connect", () => {
      console.log("✅ WebSocket connected to /game");
    });

    newSocket.on("disconnect", (reason) => {
      console.log(`❌ WebSocket disconnected: ${reason}`);
    });

    newSocket.on("connect_error", (err) => {
      console.error("⚠️ WebSocket connection error:", err.message);
    });

    newSocket.on("multiplierUpdate", (data) => {
      console.log("📈 multiplierUpdate", data);
      const val = data.multiplier;
      setMultiplier(val);
      multiplierRef.current = val;
    });

    newSocket.on("roundState", (data) => {
      console.log("🔄 roundState", data);
      setRoundState(data);
    });

    newSocket.on("countdown", (data) => {
      console.log("⏳ countdown", data);
      setCountdown(data.seconds);
    });

    newSocket.on("roundEnded", (data) => {
      console.log("🏁 roundEnded", data);
      setMultiplier(data.multiplier);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token]);

  return { socket, multiplier, roundState, countdown };
};