import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminDb } from "@/lib/supabase/server";

async function login(formData: FormData) {
  "use server";
  if (formData.get("password") !== process.env.ADMIN_METRICS_PASSWORD) return;
  const jar = await cookies();
  jar.set("qd_admin", process.env.ADMIN_METRICS_PASSWORD ?? "", { httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",maxAge:3600 });
  redirect("/admin/metrics");
}

export default async function MetricsPage() {
  const jar=await cookies();
  if(!process.env.ADMIN_METRICS_PASSWORD||jar.get("qd_admin")?.value!==process.env.ADMIN_METRICS_PASSWORD)
    return <main className="shell"><div className="card" style={{margin:"auto 0"}}><h1>Metriche QuickDuel</h1><form action={login}>
      <input name="password" type="password" className="input" placeholder="Password admin"/><button className="btn primary" style={{marginTop:12}}>Accedi</button>
    </form></div></main>;
  const db=adminDb();
  const [{count:rooms},{count:joined},{count:started},{count:completed},{data:events},{data:answers},{data:reports},{data:games}]=await Promise.all([
    db.from("rooms").select("*",{count:"exact",head:true}),
    db.from("rooms").select("*",{count:"exact",head:true}).not("guest_player_id","is",null),
    db.from("analytics_events").select("*",{count:"exact",head:true}).eq("event_name","game_started"),
    db.from("analytics_events").select("*",{count:"exact",head:true}).eq("event_name","game_completed"),
    db.from("analytics_events").select("event_name,room_id"),
    db.from("answers").select("response_time_ms,is_correct"),
    db.from("question_reports").select("reason,questions(question_text)"),
    db.from("games").select("room_id,rematch_of_game_id")
  ]);
  const n=(x:number|null)=>x??0, pct=(a:number,b:number)=>b?`${Math.round(a/b*100)}%`:"—";
  const shares=events?.filter(e=>["invite_shared","invite_copied"].includes(e.event_name)).length??0;
  const disconnects=events?.filter(e=>e.event_name==="player_disconnected").length??0;
  const rematches=games?.filter(g=>g.rematch_of_game_id).length??0;
  const metrics=[
    ["Stanze create",n(rooms)],["Stanze con 2 giocatori",n(joined)],["Partite iniziate",n(started)],
    ["Partite completate",n(completed)],["Tasso completamento",pct(n(completed),n(started))],
    ["Partite medie / stanza",n(rooms)?((games?.length??0)/n(rooms)).toFixed(1):"—"],
    ["Tasso rivincita",pct(rematches,n(completed))],["Inviti condivisi",pct(shares,n(rooms))],
    ["Tempo medio risposta",answers?.length?`${Math.round(answers.reduce((s,a)=>s+a.response_time_ms,0)/answers.length)} ms`:"—"],
    ["Risposte corrette",answers?.length?pct(answers.filter(a=>a.is_correct).length,answers.length):"—"],
    ["Disconnessioni in partita",disconnects]
  ];
  return <main className="shell" style={{width:"min(100% - 32px,960px)"}}><p className="eyebrow">Admin</p><h1>Metriche di validazione</h1>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:12}}>
      {metrics.map(([label,value])=><div className="card" key={String(label)}><small className="muted">{label}</small><strong style={{display:"block",fontSize:"2rem",marginTop:6}}>{value}</strong></div>)}
    </div><h2 style={{marginTop:32}}>Domande segnalate</h2><div className="card">{reports?.length?reports.map((r,i)=>{
      const related=r.questions as unknown as {question_text:string}|null;
      return <p key={i}>{related?.question_text} <span className="muted">— {r.reason}</span></p>;
    }):<p className="muted">Nessuna segnalazione.</p>}</div>
  </main>;
}
