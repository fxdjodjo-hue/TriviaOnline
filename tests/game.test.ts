import { describe, expect, it } from "vitest";
import { canJoinRoom, determineWinner, generateRoomCode, hasTimedOut, scoreAnswer, selectUnique, speedBonus, validateNickname } from "@/lib/game";

describe("regole QuickDuel",()=>{
  it("genera codici leggibili di sei caratteri",()=>expect(generateRoomCode(()=>0)).toBe("AAAAAA"));
  it("valida e normalizza il nickname",()=>{
    expect(validateNickname("  Astro   Vale ")).toBe("Astro Vale");
    expect(()=>validateNickname("")).toThrow();
    expect(()=>validateNickname("x".repeat(21))).toThrow();
  });
  it("impedisce il terzo giocatore e le stanze scadute",()=>{
    expect(canJoinRoom(null,new Date(Date.now()+1000).toISOString())).toBe(true);
    expect(canJoinRoom("guest",new Date(Date.now()+1000).toISOString())).toBe(false);
    expect(canJoinRoom(null,new Date(Date.now()-1000).toISOString())).toBe(false);
  });
  it("seleziona senza duplicati",()=>expect(new Set(selectUnique([1,2,3,4],3,()=>.4)).size).toBe(3));
  it("calcola bonus e punteggio",()=>{
    expect(speedBonus(0)).toBe(50);expect(speedBonus(2500)).toBe(25);expect(speedBonus(5000)).toBe(0);
    expect(scoreAnswer(true,0)).toBe(150);expect(scoreAnswer(false,0)).toBe(0);
  });
  it("gestisce cinque secondi di lettura e cinque di risposta",()=>{
    const start="2026-01-01T00:00:00.000Z";
    expect(hasTimedOut(start,new Date(start).getTime()+4999)).toBe(false);
    expect(hasTimedOut(start,new Date(start).getTime()+5000)).toBe(false);
    expect(hasTimedOut(start,new Date(start).getTime()+9999)).toBe(false);
    expect(hasTimedOut(start,new Date(start).getTime()+10000)).toBe(true);
  });
  it("determina vincitore, spareggio per corrette e parità",()=>{
    expect(determineWinner([{playerId:"a",score:200,correct:1},{playerId:"b",score:100,correct:1}])).toBe("a");
    expect(determineWinner([{playerId:"a",score:200,correct:2},{playerId:"b",score:200,correct:1}])).toBe("a");
    expect(determineWinner([{playerId:"a",score:200,correct:2},{playerId:"b",score:200,correct:2}])).toBeNull();
  });
});
