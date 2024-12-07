import { expect, test } from 'vitest'
import createPayment from "./payment.ts";


test("Create Pix Info for payment", async () => {
    const pay = await createPayment({
        buyer_email: "flavionogueirabarros@gmail.com",
        description: "Test purchase",
        paymentMethodId: "pix",
        transaction_amount: 100,
        identification_number: "42324752816",
        identification_type: "cpf"
    });
    console.log(pay.point_of_interaction);
  expect(pay.api_response.status).toBe(201);
});