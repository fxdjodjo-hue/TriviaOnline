import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QuickDuel — Trivia 1 contro 1",
  description: "7 domande. 5 secondi. Un solo vincitore."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
