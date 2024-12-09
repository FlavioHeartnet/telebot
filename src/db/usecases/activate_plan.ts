import { supabaseAdmin } from "../supabase";

export default async function activatePlan(payment_id: number,){
    try{
        const date = new Date();
        const resp = await supabaseAdmin().from('payments').update({
            expire_in: new Date(date.setDate(date.getDate() + 30))
        }).eq('payment_id', payment_id); 
        console.log(resp.status);
    }catch(e){
        throw new Error("Supabase Error: "+ e);
    }
} 