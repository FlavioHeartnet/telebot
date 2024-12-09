import { expect, test } from "vitest";
import createPayment from "./db/usecases/payment.ts";

test("Create Pix Info for payment", async () => {
  const pay = await createPayment({
    buyer_email: "flavionogueirabarros@gmail.com",
    description: "Test purchase",
    paymentMethodId: "pix",
    transaction_amount: 1,
    identification_number: "42324752816",
    identification_type: "cpf",
  });
  //console.log(pay);
  expect(pay.api_response.status).toBe(201);
});
