"use client";
import { useEffect, useState } from "react";
import { GameSectionShell } from "@/components/game-home/GameSectionShell";

export function ProfileClient() {
  const [nickname, setNickname] = useState("Nuovo sfidante");
  useEffect(() => setNickname(localStorage.getItem("quickduel_nickname") || "Nuovo sfidante"), []);

  return (
    <GameSectionShell active="profile" eyebrow="Giocatore" title="Profilo">
      <section className="section-card profile-screen-head">
        <div className="profile-orb" aria-hidden>⚡</div>
        <h2>{nickname}</h2>
        <p>Livello 1 · Principiante</p>
        <div className="profile-xp"><span /></div>
        <small>0 / 500 XP</small>
      </section>
      <section className="profile-screen-stats">
        <article><b>0</b><span>Partite</span></article>
        <article><b>0%</b><span>Vittorie</span></article>
        <article><b>0</b><span>Serie</span></article>
      </section>
      <section className="section-card profile-achievements">
        <h3>Traguardi</h3>
        <div><span aria-hidden>◇</span><p><b>Prima sfida</b><small>Completa la tua prima partita</small></p><em>0 / 1</em></div>
        <div><span aria-hidden>♛</span><p><b>Prima vittoria</b><small>Vinci una partita</small></p><em>0 / 1</em></div>
      </section>
    </GameSectionShell>
  );
}
