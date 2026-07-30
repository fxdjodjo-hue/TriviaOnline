"use client";

import { GameBottomNavigation } from "@/components/game-home/GameBottomNavigation";
import { PlayerHeader } from "@/components/game-home/PlayerHeader";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function JoinRoomPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setNickname(localStorage.getItem("quickduel_nickname") ?? ""), []);

  async function joinRoom(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "join", nickname, code })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      localStorage.setItem("quickduel_nickname", nickname.trim());
      localStorage.setItem(
        `quickduel_${data.code}`,
        JSON.stringify({ playerId: data.playerId, token: data.token })
      );
      router.push(`/room/${data.code}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Errore inatteso.");
      setBusy(false);
    }
  }

  return (
    <main className="game-home join-room-page">
      <div className="home-ambient" aria-hidden />
      <PlayerHeader nickname={nickname} onNicknameChange={setNickname} />

      <section className="join-room-content">
        <Link className="join-room-back" href="/">{"\u2039"} Home</Link>
        <p className="hero-brand">Quick<span>Duel</span></p>
        <h1>Entra in una stanza</h1>
        <p>Inserisci il codice ricevuto dal tuo amico.</p>

        <form className="join-code" onSubmit={joinRoom}>
          <input
            aria-label="Codice stanza"
            autoCapitalize="characters"
            autoComplete="off"
            inputMode="text"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/[^a-z0-9]/gi, "").toUpperCase())}
            placeholder="CODICE STANZA"
          />
          <button disabled={busy || code.length !== 6}>
            {busy ? "Attendi\u2026" : "Entra"}
          </button>
        </form>
        {error && <p className="error home-error" role="alert">{error}</p>}
      </section>

      <GameBottomNavigation active="home" />
    </main>
  );
}
