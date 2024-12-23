import { getPaymentToken } from "./get_payment_token.ts";
import { mpSetup } from "./mp-setup.ts";
import { dbErrorsCheck } from "../db/db_errors.ts";
import { supabaseAdmin } from "../db/supabase.ts";
import { splitPaymentFee } from "./split_payment.ts";

export type PaymentParam = {
  transaction_amount: number;
  description: string;
  paymentMethodId: string;
  buyer_email: string;
  bot?: number;
  product: number;
};

export default async function createPayment(req: PaymentParam) {
  try {
    const mpToken = await getPaymentToken(req.bot || 0);
    const payment = await mpSetup(mpToken);
    const app_fee = splitPaymentFee(req.transaction_amount);
    const paymentResp = await payment.create({
      body: {
        transaction_amount: req.transaction_amount,
        description: req.description,
        payment_method_id: req.paymentMethodId,
        payer: {
          email: req.buyer_email,
        },
        application_fee: app_fee,
      },
      requestOptions: { idempotencyKey: crypto.randomUUID() },
    });
    const info = await payment.get({ id: paymentResp.id ?? 0 });

    const { error } = await supabaseAdmin().from("payments").insert({
      created_at: new Date(),
      email: req.buyer_email,
      payment_id: paymentResp.id,
      payment_status: info.status_detail,
      transaction_amount: req.transaction_amount,
      application_fee: app_fee,
      bot: req.bot,
      product: req.product,
    });
    dbErrorsCheck(error);
    return paymentResp;
  } catch (e) {
    console.log(e);
    throw new Error("Falha: " + e);
  }
}
