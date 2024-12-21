import { dbErrorsCheck } from "../db/db_errors";
import { supabaseAdmin } from "../db/supabase";

export async function getPaymentToken(bot_id: number) {
  const { data, error } = await supabaseAdmin().from("bots")
    .select("payment_token").eq("id", bot_id);
  dbErrorsCheck(error);
  if (data) {
    return data[0].payment_token as string;
  }

  throw new Error("bot not found");
}
