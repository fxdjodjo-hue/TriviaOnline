import { GameSectionShell } from "@/components/game-home/GameSectionShell";

const players = [
  ["Nova", "1.840 XP"],
  ["QuizFox", "1.590 XP"],
  ["AstroVale", "1.210 XP"],
  ["MindBolt", "980 XP"],
  ["LunaByte", "760 XP"]
];

export default function RankingPage() {
  return (
    <GameSectionShell active="ranking" eyebrow="Stagione zero" title="Classifica">
      <section className="ranking-podium" aria-label="Podio">
        <article><span>2</span><b>QuizFox</b><small>1.590 XP</small></article>
        <article className="winner"><span>1</span><b>Nova</b><small>1.840 XP</small></article>
        <article><span>3</span><b>AstroVale</b><small>1.210 XP</small></article>
      </section>
      <section className="section-card ranking-screen-list">
        {players.map(([name, xp], index) => (
          <div key={name}><span>#{index + 1}</span><b>{name}</b><strong>{xp}</strong></div>
        ))}
      </section>
      <p className="section-note">La classifica reale sarà alimentata dai risultati delle partite.</p>
    </GameSectionShell>
  );
}
