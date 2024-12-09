import { supabaseAdmin } from "../supabase";

export default async function UpdatePaymentWithChatId(
  telegram_id: number,
  payment_id: number,
) {
  try {
    const resp = await supabaseAdmin().from("payments").update({
      telegram_id: telegram_id,
    }).eq("payment_id", payment_id);
    console.log(resp.status);
  } catch (e) {
    throw new Error("Supabase Error: " + e);
  }
}
