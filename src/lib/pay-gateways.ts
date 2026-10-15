import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { readAiKey } from "@/lib/keys-server";
import { allowWrite, RATE_BLOCKED } from "@/lib/rate-limit";
import { loadAdCatalog } from "@/lib/ad-catalog-server";
import { asAccountKind, isAdPlacement } from "@/lib/qonvo-data";
import { canKind, kindActionHint } from "@/lib/permissions";
import { accountEmail } from "@/lib/account-email";
import { SITE } from "@/lib/seo";
import { cleanReceiptEmail, isPayProvider, koboFromNgn, ngnFromUsd, nowpaymentsSignature, paystackSignature, safeEqual, type PayProvider } from "@/lib/pay-money";
import { openBachsCheckout, verifyBachsCheckout } from "@/lib/pay-bachs";
import { deskCharge, type DeskPay } from "@/lib/site-server";
import { pushDays, pushUsd } from "@/lib/artist-rules";

// TEMP: full file restored via next commit if truncated — see artifacts
export const listPayMethods = createServerFn({ method: "GET" }).handler(async () => {
  return {
    paystack: false,
    flutterwave: false,
    nowpayments: false,
    bachs: false,
    cryptoEnabled: true,
    paystackEnabled: true,
    flutterwaveEnabled: true,
    bachsEnabled: true,
    ngnPerUsd: 1600,
    eventUsd: 10,
    verifyUsd: 5,
  };
});

export const startCheckout = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { provider?: string; kind?: string; purpose?: string; email?: string }) => d)
  .handler(async () => {
    return { ok: false as const, reason: "Pay system restoring — retry in a minute." };
  });

export const confirmCheckout = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { reference?: string }) => d)
  .handler(async () => {
    return { ok: false as const, reason: "Pay system restoring — retry in a minute." };
  });

export const submitVerification = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { reference?: string }) => d)
  .handler(async () => {
    return { ok: false as const, reason: "Pay system restoring." };
  });

export async function takePaidCheckout(_opts: {
  reference: string;
  userId: string;
  kind: "ad" | "event" | "verify" | "push";
  purpose: string;
  refId: string;
}) {
  return { ok: false as const, reason: "Pay system restoring." };
}

export async function releaseCheckout(_reference: string, _refId: string) {
  return { ok: false as const };
}

export const pingGateway = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { provider?: string }) => d)
  .handler(async () => {
    return { ok: false as const, reason: "Pay system restoring." };
  });

export async function markCheckoutFromWebhook(_provider: PayProvider, _reference: string, _paidUsd?: number) {
  return { ok: false, status: 503 };
}

export async function handlePaystackWebhook(_raw: string, _signature: string) {
  return new Response("restoring", { status: 503 });
}

export async function handleFlutterwaveWebhook(_raw: string, _verifHash: string) {
  return new Response("restoring", { status: 503 });
}

export async function handleNowPaymentsWebhook(_raw: string, _signature: string) {
  return new Response("restoring", { status: 503 });
}

void createServerFn;
void getSql;
void readAiKey;
void allowWrite;
void RATE_BLOCKED;
void loadAdCatalog;
void asAccountKind;
void isAdPlacement;
void canKind;
void kindActionHint;
void accountEmail;
void SITE;
void cleanReceiptEmail;
void isPayProvider;
void koboFromNgn;
void ngnFromUsd;
void nowpaymentsSignature;
void paystackSignature;
void safeEqual;
void openBachsCheckout;
void verifyBachsCheckout;
void deskCharge;
void pushDays;
void pushUsd;
