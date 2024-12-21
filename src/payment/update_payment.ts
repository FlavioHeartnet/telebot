import { dbErrorsCheck } from "../db/db_errors";
import { supabaseAdmin } from "../db/supabase";

export default async function UpdatePaymentWithChatId(
  telegram_id: number,
  payment_id: number,
) {
  try {
    const { status, error } = await supabaseAdmin().from("payments").update({
      telegram_id: telegram_id,
    }).eq("payment_id", payment_id);
    console.log(status);
    dbErrorsCheck(error);
  } catch (e) {
    throw new Error("Supabase Error: " + e);
  }
}
