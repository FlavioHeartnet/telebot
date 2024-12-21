import { dbErrorsCheck } from "../db_errors";
import { supabaseAdmin } from "../supabase";

export default async function activatePlan(
  payment_id: number,
  payment_status: string = "",
) {
  try {
    const date = new Date();
    const {data, error} = await supabaseAdmin().from("payments").select("expire_in").eq("payment_id", payment_id);
    dbErrorsCheck(error);
    if(data){
      if(!data[0].expire_in){
        const { error } = await supabaseAdmin().from("payments").update({
          expire_in: new Date(date.setDate(date.getDate() + 30)),
          payment_status: payment_status,
        }).eq("payment_id", payment_id);
        dbErrorsCheck(error);
      }
    }
  } catch (e) {
    throw new Error("Supabase Error: " + e);
  }
}
