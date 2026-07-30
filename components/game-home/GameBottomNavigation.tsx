import type { HomePanel } from "./HomePanelModal";

export function GameBottomNavigation({ onOpen }: { onOpen: (panel: HomePanel) => void }) {
  return (
    <nav className="game-bottom-nav" aria-label="Navigazione principale">
      <button className="active" type="button"><span aria-hidden>⌂</span>Home</button>
      <button type="button" onClick={() => onOpen("ranking")}><span aria-hidden>♛</span>Classifica</button>
      <button type="button" onClick={() => onOpen("missions")}><span aria-hidden>◎</span>Missioni</button>
      <button type="button" onClick={() => onOpen("profile")}><span aria-hidden>♙</span>Profilo</button>
    </nav>
  );
}
