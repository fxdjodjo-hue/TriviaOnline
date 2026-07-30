"use client";
import { browserDb } from "@/lib/supabase/client";
import type { PublicPlayer, RoomState } from "@/lib/contracts";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type Session = { playerId:string; token:string };
const post = async (url:string, body:unknown) => {
  const response = await fetch(url,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
  const data = await response.json(); if (!response.ok) throw new Error(data.error); return data;
};

export function RoomClient({ code }: { code:string }) {
  const [session,setSession] = useState<Session|null>(null);
  const [joinName,setJoinName] = useState("");
  const [state,setState] = useState<RoomState|null>(null);
  const [error,setError] = useState("");
  const [selected,setSelected] = useState<number|null>(null);
  const [remaining,setRemaining] = useState(5_000);
  const [readingRemaining,setReadingRemaining] = useState(5_000);
  const questionId = useRef<string|null>(null);

  const load = useCallback(async (s:Session) => {
    try { setState(await post(`/api/rooms/${code}/state`,s)); setError(""); }
    catch(cause){ setError(cause instanceof Error?cause.message:"Connessione non disponibile."); }
  },[code]);
  useEffect(()=>{
    const raw=localStorage.getItem(`quickduel_${code}`);
    if(!raw){setJoinName(localStorage.getItem("quickduel_nickname")??"");return;}
    const s=JSON.parse(raw) as Session; setSession(s); void load(s);
  },[code,load]);
  useEffect(()=>{
    if(!session)return;
    const poll=setInterval(()=>void load(session),1000);
    const db=browserDb();
    const channel=db?.channel(`room:${code}`).on("postgres_changes",{event:"*",schema:"public",table:"rooms"},()=>void load(session))
      .on("postgres_changes",{event:"*",schema:"public",table:"games"},()=>void load(session))
      .on("postgres_changes",{event:"*",schema:"public",table:"answers"},()=>void load(session)).subscribe();
    return()=>{clearInterval(poll);if(channel)void db?.removeChannel(channel);};
  },[code,load,session]);
  useEffect(()=>{
    if(state?.question?.id!==questionId.current){questionId.current=state?.question?.id??null;setSelected(null);}
    const tick=()=>{
      if(!state?.question)return;
      const now=Date.now();
      setReadingRemaining(Math.max(0,new Date(state.question.answerOpensAt).getTime()-now));
      setRemaining(Math.max(0,new Date(state.question.closesAt).getTime()-now));
    };
    tick();const id=setInterval(tick,100);return()=>clearInterval(id);
  },[state?.question]);

  async function answer(index:number){if(!session||selected!==null)return;setSelected(index);
    try{await post(`/api/rooms/${code}/answer`,{...session,selectedOption:index});await load(session);}
    catch(cause){setError(cause instanceof Error?cause.message:"Risposta non inviata.");}
  }
  async function metric(eventName:string){if(session)await post(`/api/rooms/${code}/events`,{...session,eventName}).catch(()=>undefined);}
  async function share(kind:"invite"|"result"="invite"){
    const text=kind==="invite"?`Ti sfido a QuickDuel! ${location.href}`:`Risultato QuickDuel: ${state?.players.map(p=>`${p.nickname} ${p.score}`).join(" – ")}. Gioca anche tu!`;
    if(navigator.share){await navigator.share({title:"QuickDuel",text,url:location.href});await metric("invite_shared");}
    else{await navigator.clipboard.writeText(text);await metric("invite_copied");}
  }
  async function join(){try{const data=await post("/api/rooms",{action:"join",nickname:joinName,code});
    const s={playerId:data.playerId,token:data.token};localStorage.setItem("quickduel_nickname",joinName.trim());
    localStorage.setItem(`quickduel_${code}`,JSON.stringify(s));setSession(s);await load(s);
  }catch(cause){setError(cause instanceof Error?cause.message:"Impossibile entrare.");}}
  if(!session)return <Shell><p className="eyebrow">Invito {code}</p><h1>Entra nella sfida</h1><div className="card">
    <label htmlFor="join-nickname" style={{display:"block",marginBottom:8,fontWeight:700}}>Il tuo nickname</label>
    <input id="join-nickname" className="input" maxLength={20} value={joinName} onChange={e=>setJoinName(e.target.value)}/>
    <button className="btn primary" style={{marginTop:12}} onClick={join}>Entra nella sfida</button>{error&&<p className="error">{error}</p>}</div></Shell>;
  if(error&&!state)return <Shell><p className="error">{error}</p><Link className="btn secondary" href="/" style={{textAlign:"center"}}>Torna alla home</Link></Shell>;
  if(!state)return <Shell><p className="muted">Caricamento della sfida…</p></Shell>;
  const me=state.players.find(p=>p.id===session.playerId);
  const rival=state.players.find(p=>p.id!==session.playerId);
  if(state.status==="waiting")return <Shell>
    <p className="eyebrow">Stanza {code}</p><h1 style={{fontSize:"2.5rem",margin:"8px 0"}}>Sfida creata.</h1>
    <p className="muted">Condividi l’invito. La partita parte appena entra il tuo avversario.</p>
    <div className="card" style={{marginTop:18,textAlign:"center"}}><div style={{fontSize:"2rem",fontWeight:900,letterSpacing:".14em"}}>{code}</div>
      <button className="btn primary" onClick={()=>share()} style={{marginTop:18}}>Condividi invito</button></div>
    <p className="muted" style={{textAlign:"center"}}>In attesa dell’avversario<span aria-hidden> ···</span></p>
  </Shell>;
  if(state.status==="countdown"){const count=Math.max(1,Math.ceil((new Date(state.countdownEndsAt!).getTime()-Date.now())/1000));
    return <Shell><p className="eyebrow">Avversario trovato</p><div style={{margin:"auto",textAlign:"center"}}>
      <div style={{fontSize:"8rem",fontWeight:900,color:"var(--lime)"}}>{count}</div><h1>Preparati!</h1>
      <p>{me?.nickname} <span className="muted">contro</span> {rival?.nickname}</p></div></Shell>;}
  if(state.status==="finished")return <Shell><Result state={state} me={me} rival={rival}
    rematch={()=>post(`/api/rooms/${code}/rematch`,session).then(()=>load(session))} share={()=>share("result")}
    newOpponent={()=>{void metric("new_opponent_clicked");location.href="/";}} /></Shell>;
  const q=state.question; if(!q)return <Shell><p className="muted">Preparazione della domanda…</p></Shell>;
  const resolved=q.resolution; const mine=resolved?.answers[session.playerId];
  const isReading=readingRemaining>0;
  const phaseRemaining=isReading?readingRemaining:remaining;
  return <Shell>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"end"}}>
      <div><span className="eyebrow">Domanda</span><b style={{display:"block",fontSize:"1.4rem"}}>{q.order+1} / 7</b></div>
      <div style={{textAlign:"right"}}><b>{me?.score}</b> <span className="muted">—</span> <b>{rival?.score}</b><small className="muted" style={{display:"block"}}>{me?.nickname} · {rival?.nickname}</small></div>
    </div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:18}}>
      <b style={{color:isReading?"#c4b5fd":"var(--lime)"}}>{isReading?"Leggi la domanda":"Rispondi ora"}</b>
      <b aria-live="polite">{Math.max(0,Math.ceil(phaseRemaining/1000))}s</b>
    </div>
    <div className="timer" style={{margin:"8px 0 18px"}}><div style={{width:`${phaseRemaining/50}%`,background:isReading?"#a78bfa":"var(--lime)"}}/></div>
    <section className="card"><p className="eyebrow">{q.category}</p><h1 style={{fontSize:"clamp(1.5rem,7vw,2.2rem)",lineHeight:1.08,margin:"10px 0 22px"}}>{q.text}</h1>
      {isReading&&!resolved?<div style={{minHeight:286,display:"grid",placeItems:"center",textAlign:"center",border:"1px dashed #475569",borderRadius:16}}>
        <div><strong style={{fontSize:"2.5rem",color:"#c4b5fd"}}>{Math.ceil(readingRemaining/1000)}</strong><p className="muted" style={{margin:"6px 0 0"}}>Le risposte appariranno tra poco</p></div>
      </div>:<div style={{display:"grid",gap:10}}>{q.options.map((option,index)=>{
        let cls="";if(selected===index)cls="selected";if(resolved&&index===resolved.correctOption)cls="correct";else if(resolved&&selected===index)cls="wrong";
        return <button key={option} className={`btn answer ${cls}`} disabled={selected!==null||remaining===0} onClick={()=>answer(index)}>
          <span className="muted" style={{marginRight:10}}>{String.fromCharCode(65+index)}</span>{option}</button>;
      })}</div>}
      {resolved&&<p role="status" style={{fontWeight:800,color:mine?.correct?"#86efac":"#fca5a5",marginBottom:0}}>{mine?.correct?`Corretta! +${mine.points}`:"Non questa volta."}</p>}
      {!resolved&&selected!==null&&<p className="muted" style={{marginBottom:0}}>Risposta bloccata. Aspettiamo l’avversario…</p>}
      {resolved&&<details style={{marginTop:14}}><summary className="muted" style={{cursor:"pointer"}}>Segnala domanda</summary>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:10}}>{[["wrong_answer","Risposta sbagliata"],["unclear","Poco chiara"],["too_long","Troppo lunga"],["offensive","Offensiva"],["other","Altro"]].map(([reason,label])=>
          <button key={reason} className="btn secondary" style={{width:"auto",padding:"8px 10px"}} onClick={()=>post(`/api/rooms/${code}/report`,{...session,gameQuestionId:q.id,reason}).then(()=>setError("Segnalazione ricevuta."))}>{label}</button>)}</div>
      </details>}
    </section>{error&&<p className="error">{error}</p>}
  </Shell>;
}

function Shell({children}:{children:React.ReactNode}){return <main className="shell"><header className="brand">Quick<span>Duel</span></header><div style={{margin:"auto 0"}}>{children}</div></main>}
function Result({state,me,rival,rematch,share,newOpponent}:{state:RoomState;me:PublicPlayer|undefined;rival:PublicPlayer|undefined;rematch:()=>void;share:()=>void;newOpponent:()=>void}){
  const tie=!state.winnerPlayerId;const won=state.winnerPlayerId===me?.id;
  return <><p className="eyebrow">Partita conclusa</p><h1 style={{fontSize:"3.2rem",lineHeight:1,margin:"10px 0"}}>{tie?"Pareggio.":won?"Hai vinto!":"Bella sfida."}</h1>
    <div className="card" style={{margin:"22px 0"}}>{[me,rival].map((p)=><div key={p?.id} style={{display:"flex",justifyContent:"space-between",padding:"12px 0",borderBottom:"1px solid #263246"}}>
      <span><b>{p?.nickname}</b><small className="muted" style={{display:"block"}}>{p?.correct}/7 corrette · media {p?.avgResponseMs??"—"} ms</small></span><strong style={{fontSize:"1.8rem"}}>{p?.score}</strong></div>)}</div>
    <button className="btn primary" onClick={rematch}>Rivincita</button>
    <button className="btn secondary" onClick={share} style={{marginTop:10}}>Condividi risultato</button>
    <button onClick={newOpponent} style={{background:"none",border:0,color:"#cbd5e1",width:"100%",padding:16,cursor:"pointer"}}>Sfida un altro amico</button>
    {state.rematchRequestedBy.length===1&&<p className="muted" style={{textAlign:"center"}}>In attesa che l’avversario accetti…</p>}</>;
}
