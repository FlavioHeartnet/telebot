import { expect, test } from "vitest";
import { splitPaymentFee } from "./split_payment";
import { getTimeToExpire } from "../db/usecases/get_expire_time";

test("split price function should return 15", () => {
  const fee = splitPaymentFee(300);
  expect(fee).toBe(16);
});

test("Time should be pu 3 months ahead", () => {
  const date = getTimeToExpire(3)
  console.log(date)
  expect(date).toBeInstanceOf(Date)
});
