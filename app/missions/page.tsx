import { DailyMissionCard } from "@/components/game-home/DailyMissionCard";
import { GameSectionShell } from "@/components/game-home/GameSectionShell";

const missions = [
  { icon: "◎", title: "Vinci una partita", detail: "Completa una sfida con una vittoria", reward: "+250 XP", progress: "0 / 1" },
  { icon: "⚡", title: "Mente veloce", detail: "3 risposte sotto i 2 secondi", reward: "+150 XP", progress: "0 / 3" },
  { icon: "◇", title: "Cultura generale", detail: "Rispondi correttamente 5 volte", reward: "+100 XP", progress: "0 / 5" }
];

export default function MissionsPage() {
  return (
    <GameSectionShell active="missions" eyebrow="Obiettivi" title="Missioni">
      <DailyMissionCard />
      <section className="mission-screen-list">
        {missions.map((mission) => (
          <article className="section-card mission-screen-card" key={mission.title}>
            <span className="mission-screen-icon" aria-hidden>{mission.icon}</span>
            <div><b>{mission.title}</b><small>{mission.detail}</small><em>{mission.reward}</em></div>
            <strong>{mission.progress}</strong>
          </article>
        ))}
      </section>
      <p className="section-note">Le ricompense sono dimostrative e non influenzano ancora il multiplayer.</p>
    </GameSectionShell>
  );
}
