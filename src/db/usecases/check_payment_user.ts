import MercadoPagoConfig, { Payment } from "mercadopago";
import { config } from "./../../config";
import { supabaseAdmin } from "../supabase";

export default async function getPaymentInfoByTelegramId(telegram_id: number){
    const client = new MercadoPagoConfig({ accessToken: config.access_token ?? "" });
    const payment = new Payment(client);
    const resp = await supabaseAdmin().from('payments').select('payment_id').eq('telegram_id', telegram_id);
    if(resp.data){
        return await payment.get({id: resp.data[0].payment_id ?? 0});
    }
}