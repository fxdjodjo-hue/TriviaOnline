"use client";
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

  return <main className="shell">
    <header className="brand">Quick<span>Duel</span></header>
    <section style={{margin:"auto 0"}}>
      <p className="eyebrow">Trivia testa a testa</p>
      <h1 style={{fontSize:"clamp(2.5rem,12vw,4.5rem)",lineHeight:.94,letterSpacing:"-.065em",margin:"12px 0 14px"}}>
        Pensa in fretta.<br/>Vinci sul tempo.
      </h1>
      <p className="muted" style={{fontSize:"1.1rem",marginBottom:28}}>7 domande. 5 secondi. Un solo vincitore.</p>
      <div className="card">
        <form onSubmit={e => act("create", e)}>
          <label htmlFor="nickname" style={{display:"block",fontWeight:700,marginBottom:8}}>Il tuo nickname</label>
          <input id="nickname" className="input" maxLength={20} value={nickname} onChange={e=>setNickname(e.target.value)}
            placeholder="Es. AstroVale" autoComplete="nickname"/>
          <button className="btn primary" disabled={busy} style={{marginTop:12}}>Crea una sfida</button>
        </form>
        <div style={{display:"flex",alignItems:"center",gap:12,margin:"20px 0",color:"#64748b"}}>
          <span style={{height:1,background:"#334155",flex:1}}/><small>OPPURE</small><span style={{height:1,background:"#334155",flex:1}}/>
        </div>
        <form onSubmit={e => act("join", e)} style={{display:"grid",gridTemplateColumns:"1fr auto",gap:10}}>
          <input aria-label="Codice stanza" className="input" maxLength={6} value={code}
            onChange={e=>setCode(e.target.value.replace(/[^a-z0-9]/gi,"").toUpperCase())} placeholder="CODICE"/>
          <button className="btn secondary" disabled={busy || code.length!==6} style={{width:"auto"}}>Entra</button>
        </form>
        {error && <p className="error" role="alert" style={{marginBottom:0}}>{error}</p>}
      </div>
      <ol style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,padding:0,margin:"24px 0 0",listStyle:"none"}}>
        {["Crea","Invita","Duella"].map((x,i)=><li key={x} className="muted" style={{fontSize:".8rem"}}>
          <b style={{display:"block",color:"white",fontSize:"1rem"}}>{i+1}. {x}</b>{["Scegli un nome","Manda il link","Batti l’amico"][i]}
        </li>)}
      </ol>
    </section>
  </main>;
}
