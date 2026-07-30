"use client";
import { browserDb } from "@/lib/supabase/client";
import type { PublicPlayer, RoomState } from "@/lib/contracts";
import { REVEAL_MS } from "@/lib/game";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type Session = { playerId:string; token:string };
const post = async (url:string, body:unknown) => {
  const response = await fetch(url,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
  const data = await response.json(); if (!response.ok) throw new Error(data.error); return data;
};

export function RoomClient({ code }: { code:string }) {
  const [session,setSession] = useState<Session|null>(null);
  const [sessionChecked,setSessionChecked] = useState(false);
  const [joinName,setJoinName] = useState("");
  const [state,setState] = useState<RoomState|null>(null);
  const [error,setError] = useState("");
  const [selected,setSelected] = useState<number|null>(null);
  const [remaining,setRemaining] = useState(5_000);
  const [readingRemaining,setReadingRemaining] = useState(5_000);
  const [revealRemaining,setRevealRemaining] = useState(0);
  const questionId = useRef<string|null>(null);

  const load = useCallback(async (s:Session) => {
    try { setState(await post(`/api/rooms/${code}/state`,s)); setError(""); }
    catch(cause){ setError(cause instanceof Error?cause.message:"Connessione non disponibile."); }
  },[code]);
  useEffect(()=>{
    const raw=localStorage.getItem(`quickduel_${code}`);
    if(!raw){setJoinName(localStorage.getItem("quickduel_nickname")??"");setSessionChecked(true);return;}
    const s=JSON.parse(raw) as Session; setSession(s); setSessionChecked(true); void load(s);
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
      setRevealRemaining(state.question.revealEndsAt
        ? Math.max(0,new Date(state.question.revealEndsAt).getTime()-now)
        : 0);
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
  if(!sessionChecked)return <Shell mode="loading"><LoadingState eyebrow="Accesso alla lobby" title="Bentornato su QuickDuel" detail="Recuperiamo la tua sessione di gioco." /></Shell>;
  if(!session)return <Shell mode="lobby"><section className="room-invite">
    <header className="room-screen-heading">
      <p>Invito · {code}</p>
      <h1>Entra nella sfida.</h1>
      <span>Scegli il nome con cui ti vedranno gli altri giocatori.</span>
    </header>
    <div className="invite-panel">
      <label htmlFor="join-nickname">Il tuo nickname</label>
      <input id="join-nickname" className="input" maxLength={20} value={joinName} onChange={e=>setJoinName(e.target.value)} placeholder="Inserisci il tuo nome"/>
      <button className="play-cta invite-submit" onClick={join}><span>⚡</span> Entra nella sfida</button>
      {error&&<p className="error">{error}</p>}
    </div>
  </section></Shell>;
  if(error&&!state)return <Shell mode="lobby"><div className="room-state-error"><p className="error">{error}</p><Link className="btn secondary" href="/" style={{textAlign:"center"}}>Torna alla home</Link></div></Shell>;
  if(!state)return <Shell mode="loading"><LoadingState eyebrow="Connessione alla stanza" title="Prepariamo la sfida" detail="Sincronizzazione dei giocatori in corso." /></Shell>;
  const me=state.players.find(p=>p.id===session.playerId);
  const isHost=state.hostPlayerId===session.playerId;
  const standings=[...state.players].sort((a,b)=>b.score-a.score||b.correct-a.correct);
  if(state.status==="waiting")return <Shell mode="waiting">
    <section className="room-lobby">
      <header className="lobby-topbar">
        <Link className="lobby-back" href="/" aria-label="Torna alla home">←</Link>
        <div className="brand lobby-brand"><span aria-hidden>⚡</span> Quick<em>Duel</em></div>
        <div className="lobby-code">
          <small>Codice stanza</small>
          <strong>{code}</strong>
        </div>
      </header>
      <div className="lobby-title">
        <h1>Lobby</h1>
        <p>Fino a {state.maxPlayers} giocatori</p>
      </div>
      <section className="lobby-roster">
        <header className="lobby-roster-title">
          <b><span aria-hidden>♟</span> Giocatori</b>
          <strong>{state.players.length} <i>/ {state.maxPlayers}</i></strong>
        </header>
        <div className="lobby-player-list">
          {state.players.map(player=><div className="lobby-player" key={player.id}>
            <PlayerAvatar className="lobby-player-avatar" isCurrent={player.id===session.playerId}/>
            <div className="lobby-player-copy">
              <b>{player.nickname}{player.id===session.playerId&&<small>Tu</small>}</b>
              {player.id===state.hostPlayerId&&<em>Host</em>}
            </div>
            <span className="lobby-player-presence"><i/> Presente</span>
          </div>)}
        </div>
        <div className="lobby-info">
          <span aria-hidden>ⓘ</span>
          <p>{isHost?"Avvia la partita quando sono entrati tutti.":"La partita inizierà quando l’host preme Avvia."}</p>
        </div>
      </section>
      <footer className="lobby-actions">
        {isHost
          ? <button className="play-cta lobby-start" disabled={state.players.length<2} onClick={()=>post(`/api/rooms/${code}/start`,session).then(()=>load(session))}><span>⚡</span> {state.players.length<2?"Attendi un amico":"Avvia partita"}</button>
          : <div className="lobby-waiting" role="status"><span/><p>In attesa dell’host</p></div>}
        <button className="lobby-share" onClick={()=>share()}><span aria-hidden>▣</span> Condividi invito</button>
        <p className="lobby-meta"><span>▣ Stanza privata</span><span>{state.maxPlayers} giocatori max</span></p>
      </footer>
    </section>
  </Shell>;
  if(state.status==="countdown"){const count=Math.max(1,Math.ceil((new Date(state.countdownEndsAt!).getTime()-Date.now())/1000));
    return <Shell mode="loading"><div className="room-countdown" role="status">
      <p className="eyebrow">Partita in partenza</p>
      <div className="countdown-orb"><span>{count}</span></div>
      <h1>Preparati!</h1>
      <p>{state.players.length} giocatori pronti</p>
    </div></Shell>;}
  if(state.status==="finished")return <Shell mode="result"><Result state={state} me={me}
    rematch={()=>post(`/api/rooms/${code}/rematch`,session).then(()=>load(session))} share={()=>share("result")}
    newOpponent={()=>{void metric("new_opponent_clicked");location.href="/";}} /></Shell>;
  const q=state.question; if(!q)return <Shell mode="loading"><LoadingState eyebrow="Partita avviata" title="Prima domanda in arrivo" detail="Stiamo preparando il campo di gioco." /></Shell>;
  const resolved=q.resolution; const mine=resolved?.answers[session.playerId];
  const isResolving=Boolean(resolved);
  const isReading=!isResolving&&readingRemaining>0;
  const phaseRemaining=isResolving?revealRemaining:isReading?readingRemaining:remaining;
  const timerWidth=isResolving?phaseRemaining/(REVEAL_MS/100):phaseRemaining/50;
  const effectiveSelected=selected??mine?.selected??null;
  const myPosition=Math.max(1,standings.findIndex(player=>player.id===session.playerId)+1);
  return <Shell mode="game">
    <section className={`match-screen ${isReading?"reading":isResolving?"resolving":"answering"}`}>
      <header className="match-topbar">
        <div className="match-player">
          <PlayerAvatar className="match-player-avatar" isCurrent/>
          <span><small>Tu · #{myPosition}</small><b>{me?.nickname??"Giocatore"}</b></span>
        </div>
        <div className="match-progress"><small>Domanda</small><strong>{q.order+1}<i>/7</i></strong></div>
        <div className="match-score"><small>Score</small><strong>{me?.score??0}</strong></div>
      </header>
      <div className="match-phase">
        <div>
          <span className="match-phase-dot"/>
          <b>{isResolving?"Risultato":isReading?"Leggi la domanda":"Rispondi ora"}</b>
        </div>
        <strong aria-live="polite">{Math.max(0,Math.ceil(phaseRemaining/1000))}<small>s</small></strong>
      </div>
      <div className="match-timer"><span style={{width:`${timerWidth}%`}}/></div>
      <article className="match-card">
        {resolved?<div className={`resolution-stage ${mine?.correct?"success":"failure"}`} role="status">
          <div className="resolution-hero">
            <div className="resolution-avatar-wrap">
              <PlayerAvatar className="resolution-avatar" isCurrent/>
              <span className="resolution-status-icon">{mine?.correct?"✓":mine?"✕":"⌛"}</span>
            </div>
            <p>Risultato domanda</p>
            <h1>{mine?.correct?"Risposta corretta!":mine?"Risposta errata":"Tempo scaduto"}</h1>
            <strong>{mine?.correct?`+${mine.points} punti`:"Nessun punto"}</strong>
          </div>
          <div className="resolution-correct-answer">
            <small>Risposta corretta</small>
            <span>{String.fromCharCode(65+resolved.correctOption)}</span>
            <b>{q.options[resolved.correctOption]}</b>
          </div>
          <div className="resolution-player-list">
            {state.players.map(player=>{
              const result=resolved.answers[player.id];
              const label=!result?"Tempo scaduto":result.correct?`+${result.points} pt`:"+0 pt";
              return <div key={player.id}>
                <PlayerAvatar className="resolution-list-avatar" isCurrent={player.id===session.playerId}/>
                <span><b>{player.nickname}</b>{player.id===session.playerId&&<small>Tu</small>}</span>
                <em className={result?.correct?"correct":"wrong"}>{result?.correct?"✓":"✕"} {label}</em>
              </div>;
            })}
          </div>
          <div className="resolution-next"><span style={{width:`${timerWidth}%`}}/><p>Prossima domanda tra <b>{Math.max(0,Math.ceil(revealRemaining/1000))}</b></p></div>
          <details className="match-report"><summary>Segnala domanda</summary>
            <div>{[["wrong_answer","Risposta sbagliata"],["unclear","Poco chiara"],["too_long","Troppo lunga"],["offensive","Offensiva"],["other","Altro"]].map(([reason,label])=>
              <button key={reason} onClick={()=>post(`/api/rooms/${code}/report`,{...session,gameQuestionId:q.id,reason}).then(()=>setError("Segnalazione ricevuta."))}>{label}</button>)}</div>
          </details>
        </div>:<>
          <div className="match-question">
            <span>{q.category}</span>
            <h1>{q.text}</h1>
          </div>
          {isReading?<div className="match-reading">
            <div className="reading-orb"><span>◉</span><strong>{Math.ceil(readingRemaining/1000)}</strong></div>
            <h2>Concentrati</h2>
            <p>Le risposte appariranno allo scadere del tempo.</p>
          </div>:<div className="match-answer-list">{q.options.map((option,index)=>{
            const cls=effectiveSelected===index?"selected":"";
            return <button key={option} className={`match-answer ${cls}`} disabled={selected!==null||remaining===0} onClick={()=>answer(index)}>
              <span>{String.fromCharCode(65+index)}</span><b>{option}</b>
            </button>;
          })}</div>}
          {selected!==null&&<div className="match-locked" role="status"><span>✓</span><p>Risposta bloccata. Attendiamo gli altri giocatori.</p></div>}
        </>}
      </article>
      {error&&<p className="error match-error">{error}</p>}
    </section>
  </Shell>;
}

function Shell({children,mode="default"}:{children:React.ReactNode;mode?:"default"|"lobby"|"loading"|"waiting"|"game"|"result"}){
  return <main className={`shell ${mode!=="default"?`room-shell room-shell-${mode}`:""}`}>
    {mode!=="default"&&<div className="room-ambient" aria-hidden/>}
    {mode!=="waiting"&&mode!=="game"&&mode!=="result"&&<header className="brand room-brand">Quick<span>Duel</span></header>}
    <div className={mode!=="default"?"room-shell-content":undefined} style={mode==="default"?{margin:"auto 0"}:undefined}>{children}</div>
  </main>;
}
function LoadingState({eyebrow,title,detail}:{eyebrow:string;title:string;detail:string}){
  return <div className="room-loading" role="status">
    <div className="loading-emblem" aria-hidden><span>⚡</span></div>
    <p className="eyebrow">{eyebrow}</p>
    <h1>{title}</h1>
    <p>{detail}</p>
    <div className="loading-dots" aria-hidden><i/><i/><i/></div>
  </div>;
}
function PlayerAvatar({isCurrent,className=""}:{isCurrent:boolean;className?:string}){
  return <span className={`standard-player-avatar ${isCurrent?"lime":"purple"} ${className}`} aria-hidden>
    <Image src={isCurrent?"/game/characters/challenger-lime.webp":"/game/characters/challenger-purple.webp"} alt="" fill sizes="72px"/>
  </span>;
}
function Result({state,me,rematch,share,newOpponent}:{state:RoomState;me:PublicPlayer|undefined;rematch:()=>void;share:()=>void;newOpponent:()=>void}){
  const tie=!state.winnerPlayerId;const won=state.winnerPlayerId===me?.id;
  const finalStandings=[...state.players].sort((a,b)=>b.score-a.score||b.correct-a.correct);
  return <section className={`result-screen ${tie?"tie":won?"won":"lost"}`}>
    <header className="result-brand"><span aria-hidden>⚡</span> Quick<em>Duel</em></header>
    <div className="result-hero">
      <div className="result-emblem"><span>{tie?"=":won?"♛":"⚔"}</span></div>
      <p>Partita conclusa</p>
      <h1>{tie?"Pareggio!":won?"Vittoria!":"Bella sfida!"}</h1>
      <span>{tie?"Una sfida decisa sul filo.":won?"Hai dominato il duello.":"La prossima sarà quella giusta."}</span>
    </div>
    <div className="result-ranking">
      <header><b>Classifica finale</b><span>{state.players.length} giocatori</span></header>
      <div>{finalStandings.map((player,index)=><article className={player.id===me?.id?"current":""} key={player.id}>
        <strong>{index+1}</strong>
        <PlayerAvatar className="result-player-avatar" isCurrent={player.id===me?.id}/>
        <span><b>{player.nickname}{player.id===me?.id&&<small>Tu</small>}</b><small>{player.correct}/7 corrette · media {player.avgResponseMs??"—"} ms</small></span>
        <em>{player.score}<small>pt</small></em>
      </article>)}</div>
    </div>
    <div className="result-actions">
      <button className="play-cta" onClick={rematch}><span>↻</span> Rivincita</button>
      <button className="result-share" onClick={share}>▣ Condividi risultato</button>
      <button className="result-new" onClick={newOpponent}>Sfida un altro amico</button>
    </div>
    {state.rematchRequestedBy.length>0&&state.rematchRequestedBy.length<state.players.length&&<p className="result-waiting">{state.rematchRequestedBy.length}/{state.players.length} pronti per la rivincita…</p>}
  </section>;
}
