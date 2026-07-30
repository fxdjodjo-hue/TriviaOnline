import { reportQuestion } from "@/lib/server/game-service";
import { fail,ok } from "@/lib/server/http";

export async function POST(request:Request,context:{params:Promise<{code:string}>}){
  try{const {code}=await context.params;const {playerId,token,gameQuestionId,reason}=await request.json();
    await reportQuestion(code,playerId,token,gameQuestionId,reason);return ok({accepted:true});
  }catch(error){return fail(error);}
}
