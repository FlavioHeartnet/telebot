import { supabaseAdmin } from "../supabase";

export default async function activatePlan(payment_id: number,payment_status:string = ""){
    try{
        const date = new Date();
        const resp = await supabaseAdmin().from('payments').update({
            expire_in: new Date(date.setDate(date.getDate() + 30)),
            payment_status: payment_status
        }).eq('payment_id', payment_id); 
        console.log(resp.status);
    }catch(e){
        throw new Error("Supabase Error: "+ e);
    }
} 