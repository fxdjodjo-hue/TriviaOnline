import Image from "next/image";

export function DuelHero() {
  return (
    <section className="duel-hero" aria-labelledby="duel-title">
      <p className="hero-brand">Quick<span>Duel</span></p>
      <div className="hero-grid" aria-hidden />
      <div className="challenger challenger-lime">
        <Image
          src="/game/characters/challenger-lime.webp"
          alt=""
          fill
          priority
          sizes="(max-width: 520px) 54vw, 260px"
        />
      </div>
      <div className="challenger challenger-purple">
        <Image
          src="/game/characters/challenger-purple.webp"
          alt=""
          fill
          priority
          sizes="(max-width: 520px) 54vw, 260px"
        />
      </div>
      <div className="versus-mark"><span>VS</span></div>
      <div className="hero-copy">
        <h1 id="duel-title">Duella e <em>vinci</em></h1>
      </div>
    </section>
  );
}
