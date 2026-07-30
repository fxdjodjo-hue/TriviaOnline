import { createClient } from "@supabase/supabase-js";
import { loadEnvConfig } from "@next/env";
import { questions } from "../data/questions";

async function main() {
  loadEnvConfig(process.cwd());
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Configura NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nell'ambiente prima di eseguire il seed."
    );
  }

  const db = createClient(url, key, { auth: { persistSession: false } });
  const rows = questions.map((question) => ({
    category: question.category,
    question_text: question.question_text,
    option_a: question.options[0],
    option_b: question.options[1],
    option_c: question.options[2],
    option_d: question.options[3],
    correct_option: question.correct_option,
    difficulty: question.difficulty
  }));

  const { error } = await db.from("questions").upsert(rows, {
    onConflict: "question_text"
  });
  if (error) throw error;
  console.log(`Caricate ${rows.length} domande.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
