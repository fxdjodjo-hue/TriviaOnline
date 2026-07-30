import type { ReactNode } from "react";
import { GameBottomNavigation, type GameSection } from "./GameBottomNavigation";

export function GameSectionShell({
  active,
  eyebrow,
  title,
  children
}: {
  active: GameSection;
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="game-section-page">
      <div className="section-ambient" aria-hidden />
      <header className="section-header">
        <p>{eyebrow}</p>
        <h1>{title}</h1>
      </header>
      <div className="section-content">{children}</div>
      <GameBottomNavigation active={active} />
    </main>
  );
}
