import { expect, test } from "vitest";
import { splitPaymentFee } from "./split_payment";

test("split price function should return 15", () => {
    const fee = splitPaymentFee(300)
    expect(fee).toBe(16)
})