import { describe,expect,it } from "vitest";
import { questions } from "@/data/questions";

describe("dataset",()=>{
  it("contiene 120 domande uniche e almeno 20 per categoria",()=>{
    expect(questions).toHaveLength(120);
    expect(new Set(questions.map(q=>q.question_text.toLowerCase())).size).toBe(120);
    for(const category of new Set(questions.map(q=>q.category)))expect(questions.filter(q=>q.category===category).length).toBeGreaterThanOrEqual(20);
  });
  it("ha sempre quattro opzioni diverse e indice valido",()=>{
    for(const q of questions){expect(q.options).toHaveLength(4);expect(new Set(q.options).size).toBe(4);expect(q.correct_option).toBeGreaterThanOrEqual(0);expect(q.correct_option).toBeLessThan(4);}
  });
});
