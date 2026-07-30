"use client";
import { DuelHero } from "@/components/game-home/DuelHero";
import { GameBottomNavigation } from "@/components/game-home/GameBottomNavigation";
import { PlayerHeader } from "@/components/game-home/PlayerHeader";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => setNickname(localStorage.getItem("quickduel_nickname") ?? ""), []);

  async function createRoom(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/rooms", { method:"POST", headers:{"content-type":"application/json"},
        body:JSON.stringify({ action:"create", nickname }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      localStorage.setItem("quickduel_nickname", nickname.trim());
      localStorage.setItem(`quickduel_${data.code}`, JSON.stringify({ playerId:data.playerId, token:data.token }));
      router.push(`/room/${data.code}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Errore inatteso."); setBusy(false); }
  }

  return (
    <main className="game-home" id="top">
      <div className="home-ambient" aria-hidden />
      <PlayerHeader nickname={nickname} onNicknameChange={setNickname} />
      <DuelHero />

      <section className="play-actions" id="play">
        <form onSubmit={createRoom}>
          <button className="play-cta" disabled={busy}>
            {busy ? "Preparazione\u2026" : "Gioca"}
          </button>
        </form>
        <Link className="join-room-link" href="/join">Entra in una stanza</Link>
        {error && <p className="error home-error" role="alert">{error}</p>}
      </section>

      <GameBottomNavigation active="home" />
    </main>
  );
}
