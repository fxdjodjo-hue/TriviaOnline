const features = [
  { icon: "♛", label: "Classifica", meta: "Top 100" },
  { icon: "◎", label: "Missioni", meta: "1 attiva" },
  { icon: "◈", label: "Profilo", meta: "Livello 1" }
];

export function GameFeatureGrid() {
  return (
    <section className="feature-grid" aria-label="Funzioni">
      {features.map((feature) => (
        <button className="feature-card" key={feature.label} type="button">
          <span className="feature-icon" aria-hidden>{feature.icon}</span>
          <b>{feature.label}</b>
          <small>{feature.meta} ›</small>
        </button>
      ))}
    </section>
  );
}
