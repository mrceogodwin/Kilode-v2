import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { assertStaff } from "@/lib/staff-server";

export const AI_KEY_SLOTS = [
  { id: "openai", label: "OpenAI", hint: "Translate + SEO rewrite (gpt-4o-mini)" },
  { id: "grok", label: "xAI Grok", hint: "Rewrite + moderator assist" },
  { id: "anthropic", label: "Anthropic Claude", hint: "SEO copy fallback" },
  { id: "gemini", label: "Google Gemini", hint: "Alt rewrite" },
  { id: "deepl", label: "DeepL", hint: "Chat translate" },
  { id: "google_translate", label: "Google Cloud Translate", hint: "Chat translate" },
  { id: "newsapi", label: "NewsAPI.org", hint: "Optional headline API (RSS is default)" },
  { id: "gnews", label: "GNews", hint: "Optional headline API" },
  { id: "indexnow", label: "IndexNow key", hint: "Bing/Yandex instant index ping" },
  { id: "google_indexing", label: "Google Indexing API json", hint: "Service account JSON (optional)" },
  { id: "bing_webmaster", label: "Bing Webmaster", hint: "API key" },
  { id: "groq", label: "Groq", hint: "Fast rewrite" },
  { id: "mistral", label: "Mistral", hint: "EU rewrite fallback" },
  { id: "perplexity", label: "Perplexity", hint: "Research notes" },
  { id: "azure_openai", label: "Azure OpenAI", hint: "Enterprise rewrite" },
  { id: "huggingface", label: "Hugging Face", hint: "Open models" },
  { id: "together", label: "Together AI", hint: "Open models" },
  { id: "firecrawl", label: "Firecrawl", hint: "Page fetch for SEO audit" },
  { id: "jina", label: "Jina Reader", hint: "Clean URL text" },
  { id: "custom_webhook", label: "Custom webhook", hint: "POST JSON when a post is boosted" },
  { id: "paystack_secret", label: "Paystack secret", hint: "sk_live_… Server only. Or set env PAYSTACK_SECRET_KEY." },
  { id: "flutterwave_secret", label: "Flutterwave secret", hint: "FLWSECK_… Server only. Or set env FLUTTERWAVE_SECRET_KEY." },
  { id: "flutterwave_hash", label: "Flutterwave webhook hash", hint: "Secret hash from the Flutterwave dashboard. Or env FLUTTERWAVE_HASH." },
  { id: "ngn_per_usd", label: "Naira per 1 USD", hint: "Paystack and Flutterwave rate. Example 1600. Or env KILODE_NGN_PER_USD." },
  { id: "event_usd", label: "Event listing fee (USD)", hint: "Price to submit an event when payment is on. Example 10." },
] as const;

export type AiKeyId = (typeof AI_KEY_SLOTS)[number]["id"];

export const listAiKeys = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await assertStaff(context.userId);
    const sql = await getSql();
    await sql`create table if not exists nf_ai_keys (id text primary key, label text not null, value text not null default '', hint text not null default '', ts bigint not null)`;
    const rows = await sql<{ id: string; value: string }>`select id, value from nf_ai_keys`;
    const map = Object.fromEntries(rows.map((r) => [r.id, r.value]));
    const hidden = new Set(["paystack_secret", "flutterwave_secret", "flutterwave_hash"]);
    return AI_KEY_SLOTS.map((s) => ({
      ...s,
      value: hidden.has(s.id) ? "" : (map[s.id] ?? ""),
      set: Boolean(map[s.id]),
    }));
  });

export const saveAiKey = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string; value: string }) => d)
  .handler(async ({ context, data }) => {
    await assertStaff(context.userId, "super");
    const slot = AI_KEY_SLOTS.find((s) => s.id === data.id);
    if (!slot) return { ok: false as const, reason: "Unknown slot." };
    const sql = await getSql();
    const value = data.value.trim();
    await sql`insert into nf_ai_keys (id, label, hint, value, ts) values (${slot.id}, ${slot.label}, ${slot.hint}, ${value}, ${Date.now()})
      on conflict (id) do update set value = ${value}, ts = ${Date.now()}`;
    return { ok: true as const };
  });

export async function readAiKey(id: AiKeyId): Promise<string> {
  const sql = await getSql();
  try {
    const rows = await sql<{ value: string }>`select value from nf_ai_keys where id = ${id} limit 1`;
    return rows[0]?.value?.trim() ?? "";
  } catch {
    return "";
  }
}
