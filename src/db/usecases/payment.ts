import { MercadoPagoConfig, Payment } from "mercadopago";
import dotenv from "dotenv";
import { config } from "../../config.ts";
import { supabaseAdmin } from "../supabase.ts";

dotenv.config();
const client = new MercadoPagoConfig({
  accessToken: config.access_token ?? "",
});
const payment = new Payment(client);
export type PaymentParam = {
  transaction_amount: number;
  description: string;
  paymentMethodId: string;
  buyer_email: string;
  bot?: number;
};

export default async function createPayment(req: PaymentParam) {
  try {
    const paymentResp = await payment.create({
      body: {
        transaction_amount: req.transaction_amount,
        description: req.description,
        payment_method_id: req.paymentMethodId,
        payer: {
          email: "flavionogueirabarros@gmail.com",
        },
        application_fee: 1,
      },  
      requestOptions: { idempotencyKey: crypto.randomUUID() },
    });
    const info = await payment.get({ id: paymentResp.id ?? 0 });

    const resp = await supabaseAdmin().from("payments").insert({
      created_at: new Date(),
      email: req.buyer_email,
      payment_id: paymentResp.id,
      payment_status: info.status_detail,
      transaction_amount: req.transaction_amount,
      application_fee: 0
    });

    return paymentResp;
  } catch (e) {
    console.log(e);
    throw new Error("Falha: " + e);
  }
}
