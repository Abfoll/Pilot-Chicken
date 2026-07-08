import type { Metadata } from "next";
import "./globals.css";
import { TelegramProvider } from "@/components/TelegramProvider";
import { AuthProvider } from "@/context/AuthContext";
import { WalletProvider } from "@/context/WalletContext";
import { GameProvider } from "@/context/GameContext";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "Pilot Chicken",
  description: "Real-time multiplayer multiplier game",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <TelegramProvider>
          <AuthProvider>
            <WalletProvider>
              <GameProvider>
                {children}
                <Toaster position="bottom-center" />
              </GameProvider>
            </WalletProvider>
          </AuthProvider>
        </TelegramProvider>
      </body>
    </html>
  );
}