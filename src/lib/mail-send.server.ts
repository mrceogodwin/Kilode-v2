import nodemailer from "nodemailer";
import { env } from "@/lib/env.server";

export type OutboundMail = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

/** True when RESEND_API_KEY or SMTP_* is configured (same gate as digest subscribe). */
export function outboundMailReady(): boolean {
  return Boolean(env("RESEND_API_KEY") || env("SMTP_URL") || (env("SMTP_HOST") && env("SMTP_USER")));
}

function fromAddress(): string {
  return env("RESEND_FROM") || env("MAIL_FROM") || "Kilode <onboarding@resend.dev>";
}

async function sendResend(mail: OutboundMail): Promise<{ ok: true } | { ok: false; reason: string }> {
  const key = env("RESEND_API_KEY");
  if (!key) return { ok: false, reason: "RESEND_API_KEY missing" };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress(),
      to: [mail.to],
      subject: mail.subject,
      text: mail.text,
      html: mail.html || undefined,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, reason: `Resend ${res.status}: ${body.slice(0, 180)}` };
  }
  return { ok: true };
}

async function sendSmtp(mail: OutboundMail): Promise<{ ok: true } | { ok: false; reason: string }> {
  const url = env("SMTP_URL");
  let transport;
  try {
    if (url) {
      transport = nodemailer.createTransport(url);
    } else {
      const host = env("SMTP_HOST");
      const user = env("SMTP_USER");
      if (!host || !user) return { ok: false, reason: "SMTP_HOST/SMTP_USER missing" };
      transport = nodemailer.createTransport({
        host,
        port: Number(env("SMTP_PORT") || 587),
        secure: env("SMTP_SECURE") === "1" || env("SMTP_SECURE") === "true",
        auth: { user, pass: env("SMTP_PASS") || "" },
      });
    }
    await transport.sendMail({
      from: fromAddress(),
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "SMTP send failed" };
  }
}

/** Send one outbound email via Resend (preferred) or SMTP. */
export async function sendOutboundMail(mail: OutboundMail): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!mail.to || !mail.subject) return { ok: false, reason: "Missing to/subject" };
  if (env("RESEND_API_KEY")) return sendResend(mail);
  if (env("SMTP_URL") || (env("SMTP_HOST") && env("SMTP_USER"))) return sendSmtp(mail);
  return { ok: false, reason: "No mail provider — set RESEND_API_KEY (or SMTP_URL / SMTP_HOST+SMTP_USER+SMTP_PASS)" };
}

export function publicSiteOrigin(): string {
  return (
    env("PUBLIC_SITE_URL") ||
    env("BETTER_AUTH_URL") ||
    env("VITE_APP_URL") ||
    "https://kilode.vercel.app"
  ).replace(/\/$/, "");
}
