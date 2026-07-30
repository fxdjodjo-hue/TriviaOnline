export function DuelHero() {
  return (
    <section className="duel-hero" aria-label="QuickDuel">
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
    </section>
  );
}
