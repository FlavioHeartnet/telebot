import { dbErrorsCheck } from "../db_errors";
import { supabaseAdmin } from "../supabase";

export async function getWelcomeMessage(bot_id: number): Promise<string>{
    const {data, error } = await supabaseAdmin().from("bots").select("welcome_message").eq("id", bot_id);

    dbErrorsCheck(error);

    if(data && data.length > 0){
        return data[0].welcome_message as string;
    }else{
        return "Bem-vindo! Por favor, escolha uma das opções abaixo:";
    };
}