import Link from "next/link";

export type GameSection = "home" | "ranking" | "missions" | "profile";

export function GameBottomNavigation({ active }: { active: GameSection }) {
  return (
    <nav className="game-bottom-nav" aria-label="Navigazione principale">
      <Link className={active === "home" ? "active" : ""} href="/"><span aria-hidden>⌂</span>Home</Link>
      <Link className={active === "ranking" ? "active" : ""} href="/ranking"><span aria-hidden>♛</span>Classifica</Link>
      <Link className={active === "missions" ? "active" : ""} href="/missions"><span aria-hidden>◎</span>Missioni</Link>
      <Link className={active === "profile" ? "active" : ""} href="/profile"><span aria-hidden>♙</span>Profilo</Link>
    </nav>
  );
}
