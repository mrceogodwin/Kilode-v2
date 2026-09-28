import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cleanReceiptEmail, isCardProvider, koboFromNgn, ngnFromUsd, paystackSignature, safeEqual } from "./pay-money.ts";

describe("pay money", () => {
  it("converts slot dollars to naira and kobo", () => {
    assert.equal(ngnFromUsd(40, 1600), 64000);
    assert.equal(koboFromNgn(64000), 6_400_000);
    assert.equal(ngnFromUsd(0, 1600), 0);
    assert.equal(ngnFromUsd(40, 10), 0);
  });

  it("checks a Paystack signature and rejects a mismatch", () => {
    const raw = JSON.stringify({ event: "charge.success" });
    const sig = paystackSignature("sk_test_secret", raw);
    assert.equal(safeEqual(sig, paystackSignature("sk_test_secret", raw)), true);
    assert.equal(safeEqual(sig, paystackSignature("sk_test_other", raw)), false);
    assert.equal(safeEqual("", ""), false);
  });

  it("knows the card providers and a receipt email", () => {
    assert.equal(isCardProvider("paystack"), true);
    assert.equal(isCardProvider("btc"), false);
    assert.equal(cleanReceiptEmail("Ada@Example.com"), "ada@example.com");
    assert.equal(cleanReceiptEmail("not an email"), "");
  });
});
