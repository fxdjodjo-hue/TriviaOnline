import type { Metadata, Viewport } from "next";
import { AppSplashGate } from "@/components/splash/AppSplashGate";
import "./globals.css";

export const metadata: Metadata = {
  title: "QuickDuel — Trivia 1 contro 1",
  description: "7 domande. 5 secondi. Un solo vincitore."
};

export const viewport: Viewport = {
  themeColor: "#03050f"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body>
        <AppSplashGate>{children}</AppSplashGate>
      </body>
    </html>
  );
}
