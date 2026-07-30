import Image from "next/image";

export function DuelHero() {
  return (
    <section className="duel-hero" aria-labelledby="duel-title">
      <p className="hero-brand">Quick<span>Duel</span></p>
      <div className="hero-grid" aria-hidden />
      <Image
        className="trivia-hero-art"
        src="/game/trivia-friends-hero.webp"
        alt=""
        fill
        priority
        sizes="(max-width: 520px) 100vw, 480px"
      />
      <div className="hero-copy">
        <h1 id="duel-title">Sfida gli <em>amici</em></h1>
      </div>
    </section>
  );
}
