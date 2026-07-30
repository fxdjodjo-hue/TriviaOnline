import { DailyMissionCard } from "./DailyMissionCard";

export type HomePanel = "ranking" | "missions" | "profile";

export function HomePanelModal({
  panel,
  nickname,
  onClose
}: {
  panel: HomePanel;
  nickname: string;
  onClose: () => void;
}) {
  const title = panel === "ranking" ? "Classifica" : panel === "missions" ? "Missioni" : "Profilo";

  return (
    <div className="home-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="home-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="home-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <p>QuickDuel</p>
            <h2 id="home-modal-title">{title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Chiudi">×</button>
        </header>

        {panel === "missions" && (
          <div className="modal-stack">
            <DailyMissionCard />
            <article className="modal-info-card">
              <span className="modal-icon" aria-hidden>◎</span>
              <div><b>Vinci una partita</b><small>Ricompensa: +250 XP</small></div>
              <strong>0 / 1</strong>
            </article>
            <article className="modal-info-card">
              <span className="modal-icon" aria-hidden>⚡</span>
              <div><b>Rispondi rapidamente</b><small>3 risposte sotto i 2 secondi</small></div>
              <strong>0 / 3</strong>
            </article>
          </div>
        )}

        {panel === "ranking" && (
          <div className="ranking-list">
            {["Nova", "QuizFox", "AstroVale", nickname || "Tu"].map((player, index) => (
              <div key={`${player}-${index}`} className={index === 3 ? "current" : ""}>
                <span>#{index + 1}</span><b>{player}</b><strong>{[1840, 1590, 1210, 0][index]} XP</strong>
              </div>
            ))}
          </div>
        )}

        {panel === "profile" && (
          <div className="profile-panel">
            <div className="profile-orb" aria-hidden>⚡</div>
            <h3>{nickname || "Nuovo sfidante"}</h3>
            <p>Livello 1 · 0 vittorie</p>
            <div className="profile-stats">
              <span><b>0</b>Partite</span>
              <span><b>0%</b>Vittorie</span>
              <span><b>0</b>Serie</span>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
