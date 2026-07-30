"use client";

import { useEffect, useState } from "react";

const HERO_QUESTIONS = [
  "Qual è il pianeta più grande?",
  "Quanto fa 8 × 7?",
  "Chi dipinse la Gioconda?",
  "Qual è la capitale del Canada?",
  "In che anno sbarcò l’uomo sulla Luna?",
];

export function DuelHero() {
  const [questionIndex, setQuestionIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setQuestionIndex((current) => (current + 1) % HERO_QUESTIONS.length);
    }, 6000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <section className="duel-hero" aria-label="QuickDuel">
      <div
        className={`hero-question ${questionIndex % 2 === 0 ? "is-left" : "is-right"}`}
        key={questionIndex}
        aria-hidden="true"
      >
        {HERO_QUESTIONS[questionIndex]}
      </div>
      <p className="hero-brand">Quick<span>Duel</span></p>
    </section>
  );
}
