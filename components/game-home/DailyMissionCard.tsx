export function DailyMissionCard() {
  return (
    <section className="daily-mission">
      <div>
        <p>Missione del giorno</p>
        <b>Completa una sfida</b>
        <div className="mission-progress"><span /></div>
      </div>
      <div className="mission-reward">
        <small>Ricompensa</small>
        <strong>+100 XP</strong>
      </div>
    </section>
  );
}
