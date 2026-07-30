"use client";
import { DuelHero } from "@/components/game-home/DuelHero";
import { GameBottomNavigation } from "@/components/game-home/GameBottomNavigation";
import { PlayerHeader } from "@/components/game-home/PlayerHeader";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => setNickname(localStorage.getItem("quickduel_nickname") ?? ""), []);

  async function act(action: "create" | "join", event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/rooms", { method:"POST", headers:{"content-type":"application/json"},
        body:JSON.stringify({ action, nickname, ...(action === "join" ? { code:code.toUpperCase() } : {}) }) });
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
        <form onSubmit={(event) => act("create", event)}>
          <button className="play-cta" disabled={busy}>
            <span aria-hidden>⚡</span>
            {busy ? "Preparazione…" : "Gioca 1v1"}
          </button>
        </form>
        <form className="join-code" onSubmit={(event) => act("join", event)}>
          <input
            aria-label="Codice stanza"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/[^a-z0-9]/gi, "").toUpperCase())}
            placeholder="CODICE"
          />
          <button disabled={busy || code.length !== 6}>Entra con codice</button>
        </form>
        {error && <p className="error home-error" role="alert">{error}</p>}
      </section>

      <GameBottomNavigation active="home" />
    </main>
  );
}
