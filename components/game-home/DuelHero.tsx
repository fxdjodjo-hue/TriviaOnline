export function DuelHero() {
  return (
    <section className="duel-hero" aria-labelledby="duel-title">
      <p className="hero-brand">Quick<span>Duel</span></p>
      <div className="hero-grid" aria-hidden />
      <div className="quiz-hero-visual" aria-hidden>
        <span className="quiz-category quiz-category-left">π</span>
        <span className="quiz-category quiz-category-right">♪</span>
        <div className="quiz-card">
          <span className="quiz-timer">5</span>
          <strong>?</strong>
          <div className="quiz-options">
            <span>A</span><span>B</span><span>C</span><span>D</span>
          </div>
        </div>
      </div>
      <div className="hero-copy">
        <h1 id="duel-title">Pronto alla sfida?</h1>
        <p>7 domande <span aria-hidden>·</span> 5 secondi</p>
      </div>
    </section>
  );
}
