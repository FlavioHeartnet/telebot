import MercadoPagoConfig, { Payment } from "mercadopago";
import { config } from "./../../config";
import activatePlan from "./activate_plan";

export default async function checkPayment(payment_id: number){
    const client = new MercadoPagoConfig({ accessToken: config.access_token ?? "" });
    const payment = new Payment(client);
    const info = await payment.get({id: payment_id ?? 0});
    if(info.status == 'approved'){
        await activatePlan(payment_id, info.status_detail);
    }

    return info.status
}