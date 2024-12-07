import { Payment, MercadoPagoConfig } from 'mercadopago';
import dotenv from 'dotenv';
import { config } from './config.ts';

dotenv.config();
const client = new MercadoPagoConfig({ accessToken: config.access_token ?? "" });
const payment = new Payment(client);
export type PaymentParam = {
    transaction_amount: number;
    description: string;
    paymentMethodId: string;
    buyer_email: string;
    identification_type: string;
    identification_number: string;
}

export default async function createPayment(req: PaymentParam){
   
    try{
        const paymentResp = await payment.create({
            body: { 
                transaction_amount: req.transaction_amount,
                description: req.description,
                payment_method_id: req.paymentMethodId,
                    payer: {
                    email: req.buyer_email,
                    identification: {
                type: req.identification_type,
                number: req.identification_number
            }}},
            requestOptions: { idempotencyKey: crypto.randomUUID() }
        });
        const info = await payment.get({id: paymentResp.id ?? 0})
        info.status_detail
        console.log(info.status_detail);
        return paymentResp;
    }catch(e){
        console.log(e);
        throw new Error("Falha: "+ e);
    }
   
}