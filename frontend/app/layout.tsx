import type { Metadata } from "next";
import "./globals.css";
import { TelegramProvider } from "@/components/TelegramProvider";
import { AuthProvider } from "@/context/AuthContext";
import { WalletProvider } from "@/context/WalletContext";
import { GameProvider } from "@/context/GameContext";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "Chicken Road",
  description: "A fast, fair multiplier game made for Telegram",
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