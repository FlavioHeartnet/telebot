import { dbErrorsCheck } from "../db_errors";
import { supabaseAdmin } from "../supabase";
import { getTimeToExpire } from "./get_expire_time";

export default async function activatePlan(
  payment_id: number,
  payment_status: string = "",
) {
  try {
    const { data, error } = await supabaseAdmin().from("payments").select(
      "expire_in, product(id, type, content, period)",
    ).eq("payment_id", payment_id);
    dbErrorsCheck(error);
    if (data) {
      if (!data[0].expire_in) {
        const period = data[0].product[0].period as number || 0;
        const { error } = await supabaseAdmin().from("payments").update({
          expire_in: getTimeToExpire(period),
          payment_status: payment_status,
        }).eq("payment_id", payment_id);
        dbErrorsCheck(error);
      }
    }
  } catch (e) {
    throw new Error("Supabase Error: " + e);
  }
}
