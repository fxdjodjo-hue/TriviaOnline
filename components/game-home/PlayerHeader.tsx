import Image from "next/image";

export function PlayerHeader({
  nickname,
  onNicknameChange
}: {
  nickname: string;
  onNicknameChange: (value: string) => void;
}) {
  return (
    <section className="player-hud" aria-label="Profilo giocatore">
      <div className="player-avatar">
        <Image
          src="/game/characters/challenger-lime.webp"
          alt=""
          fill
          sizes="54px"
          priority
        />
      </div>
      <div className="player-summary">
        <input
          aria-label="Il tuo nickname"
          className="hud-nickname"
          maxLength={20}
          value={nickname}
          onChange={(event) => onNicknameChange(event.target.value)}
          placeholder="Il tuo nickname"
        />
        <div className="level-row">
          <span className="level-badge">LV. 1</span>
          <span className="streak-badge">⚡ Nuovo sfidante</span>
        </div>
      </div>
      <div className="currency-pill" aria-label="Monete">
        <span aria-hidden>●</span>
        <b>0</b>
      </div>
      <div className="xp-row">
        <b>XP</b>
        <div className="xp-track"><span /></div>
        <small>0 / 500</small>
      </div>
    </section>
  );
}
