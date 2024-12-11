import { supabaseAdmin } from "../supabase";

export default async function activatePlan(
  payment_id: number,
  payment_status: string = "",
) {
  try {
    const date = new Date();
    const verify = await supabaseAdmin().from("payments").select("expire_in").eq("payment_id", payment_id);
    if(verify.data){
      if(!verify.data[0].expire_in){
        await supabaseAdmin().from("payments").update({
          expire_in: new Date(date.setDate(date.getDate() + 30)),
          payment_status: payment_status,
        }).eq("payment_id", payment_id);
      }
    }
  } catch (e) {
    throw new Error("Supabase Error: " + e);
  }
}
