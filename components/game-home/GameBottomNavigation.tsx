export function GameBottomNavigation() {
  return (
    <nav className="game-bottom-nav" aria-label="Navigazione principale">
      <a className="active" href="#top"><span aria-hidden>⌂</span>Home</a>
      <a href="#play"><span aria-hidden>⚔</span>Sfide</a>
      <a href="#missions"><span aria-hidden>◎</span>Missioni</a>
      <a href="#profile"><span aria-hidden>♙</span>Profilo</a>
    </nav>
  );
}
