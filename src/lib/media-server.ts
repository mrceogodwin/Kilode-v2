import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { authMiddleware } from "@/lib/auth/middleware";
import { assertStaff } from "@/lib/staff-server";

function env(name: string) {
  const raw = typeof process !== "undefined" ? process.env[name] || "" : "";
  return raw.replace(/[^\x20-\x7E]/g, "").trim();
}

function storageEnv() {
  const url = env("VITE_SUPABASE_URL") || env("NEXT_PUBLIC_SUPABASE_URL") || env("SUPABASE_URL");
  const anon =
    env("VITE_SUPABASE_ANON_KEY") ||
    env("NEXT_PUBLIC_SUPABASE_ANON_KEY") ||
    env("SUPABASE_ANON_KEY") ||
    env("SUPABASE_PUBLISHABLE_KEY");
  const service = env("SUPABASE_SERVICE_ROLE_KEY") || env("SUPABASE_SERVICE_KEY") || env("SUPABASE_SECRET_KEY");
  return { url, anon, service, key: service || anon };
}

/** Server-side ticket so the browser can upload without the key being baked into the Vite build. */
export const prepareTakeUpload = createServerFn({ method: "POST" })
  .validator((d: { ext?: string; type?: string }) => ({
    ext: String(d?.ext || "jpg").replace(/[^a-z0-9]/gi, "").slice(0, 4) || "jpg",
    type: String(d?.type || "application/octet-stream").replace(/[^\w.+/-]/g, "").slice(0, 80) || "application/octet-stream",
  }))
  .handler(async ({ data }) => {
    try {
    const { url, anon, key } = storageEnv();
    if (!url || !key) {
      return {
        ok: false as const,
        reason: "Supabase is not visible to the server. In Vercel, set SUPABASE_URL and SUPABASE_ANON_KEY (a VITE_ name also works), then redeploy.",
      };
    }
    const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const bucket = "market-images";
    await admin.storage.createBucket(bucket, { public: true, fileSizeLimit: "20MB" }).catch(() => undefined);
    const path = `takes/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${data.ext}`;
    const signed = await admin.storage.from(bucket).createSignedUploadUrl(path);
    if (signed.error || !signed.data?.token) {
      return { ok: false as const, reason: "Supabase did not open an upload. Make the market-images bucket public." };
    }
    const pub = admin.storage.from(bucket).getPublicUrl(signed.data.path || path);
    const signedUrl = signed.data.signedUrl || "";
    return {
      ok: true as const,
      path: signed.data.path || path,
      token: signed.data.token,
      signedUrl,
      publicUrl: pub.data.publicUrl,
      apikey: anon,
      endpoint: `${url.replace(/\/$/, "")}/storage/v1`,
    };
    } catch {
      return { ok: false as const, reason: "Photo hosting did not open. Kilode will keep a smaller copy." };
    }
  });

const DROP_EXT = new Set(["apk", "zip", "pdf", "mp3", "m4a", "wav", "mp4", "webm", "jpg", "jpeg", "png", "webp"]);

/** Staff ticket for a product file (APK, zip, audio, video). Same market-images bucket, drops/ path. */
export const prepareDropUpload = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { ext?: string; type?: string }) => ({
    ext: String(d?.ext || "").replace(/[^a-z0-9]/gi, "").slice(0, 8).toLowerCase(),
    type: String(d?.type || "application/octet-stream").replace(/[^\w.+/-]/g, "").slice(0, 80) || "application/octet-stream",
  }))
  .handler(async ({ context, data }) => {
    await assertStaff(context.userId, "super");
    if (!DROP_EXT.has(data.ext)) return { ok: false as const, reason: "Use APK, ZIP, PDF, MP3, or MP4." };
    const { url, anon, key } = storageEnv();
    if (!url || !key) {
      return { ok: false as const, reason: "File hosting is not on. Paste an https link instead." };
    }
    const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const bucket = "market-images";
    await admin.storage.createBucket(bucket, { public: true, fileSizeLimit: "20MB" }).catch(() => undefined);
    const path = `drops/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${data.ext}`;
    const signed = await admin.storage.from(bucket).createSignedUploadUrl(path);
    if (signed.error || !signed.data?.token) {
      return { ok: false as const, reason: signed.error?.message || "Could not open an upload. Paste an https link instead." };
    }
    const pub = admin.storage.from(bucket).getPublicUrl(signed.data.path || path);
    return {
      ok: true as const,
      path: signed.data.path || path,
      token: signed.data.token,
      signedUrl: signed.data.signedUrl || "",
      publicUrl: pub.data.publicUrl,
      apikey: anon,
      endpoint: `${url.replace(/\/$/, "")}/storage/v1`,
    };
  });
