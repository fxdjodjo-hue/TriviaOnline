import { questions } from "../data/questions";

const categories=["Cultura generale","Geografia","Storia","Scienza","Sport","Cinema e TV"];
const errors:string[]=[];
const seen=new Set<string>();
for(const [index,q] of questions.entries()){
  if(!q.category||!q.question_text||!q.difficulty)errors.push(`Riga ${index+1}: campi mancanti`);
  if(q.options.length!==4)errors.push(`Riga ${index+1}: servono 4 opzioni`);
  if(new Set(q.options.map(x=>x.toLowerCase())).size!==4)errors.push(`Riga ${index+1}: opzioni duplicate`);
  if(q.correct_option<0||q.correct_option>3)errors.push(`Riga ${index+1}: risposta non valida`);
  const key=q.question_text.toLowerCase();if(seen.has(key))errors.push(`Duplicata: ${q.question_text}`);seen.add(key);
}
for(const category of categories)if(questions.filter(q=>q.category===category).length<20)errors.push(`${category}: meno di 20 domande`);
if(errors.length){console.error(errors.join("\n"));process.exit(1);}
console.log(`Seed valido: ${questions.length} domande, 20 per categoria.`);
