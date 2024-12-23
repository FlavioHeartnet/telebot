import { supabaseAdmin } from "../db/supabase";
import { getPaymentToken } from "./get_payment_token";
import { mpSetup } from "./mp-setup";

export default async function getPaymentInfoByTelegramId(
  telegram_id: number,
  bot_id: number,
) {
  const mpToken = await getPaymentToken(bot_id);
  const payment = await mpSetup(mpToken);
  const resp = await supabaseAdmin().from("payments").select("payment_id").eq(
    "telegram_id",
    telegram_id,
  ).order("created_at", { ascending: false }).limit(1);
  if (resp.data && resp.data.length > 0) {
    return await payment.get({ id: resp.data[0].payment_id ?? 0 });
  }
}
