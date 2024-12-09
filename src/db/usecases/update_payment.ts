import { supabaseAdmin } from "../supabase";

export default async function UpdatePaymentWithChatId(chatId: number, payment_id: number){
    try{
        const resp = await supabaseAdmin().from('payments').update({
            chatid: chatId
        }).eq('payment_id', payment_id); 
        console.log(resp.status);
    }catch(e){
        throw new Error("Supabase Error: "+ e);
    }
    
}