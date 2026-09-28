import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function readEnv(name: string): string {
  const vite = import.meta.env as Record<string, string | undefined>;
  const fromVite = vite[name];
  if (fromVite && fromVite.trim()) return fromVite.trim();
  if (typeof process !== "undefined" && process.env?.[name]?.trim()) return process.env[name].trim();
  return "";
}

const url = readEnv("VITE_SUPABASE_URL") || readEnv("NEXT_PUBLIC_SUPABASE_URL") || readEnv("SUPABASE_URL");
const anon = readEnv("VITE_SUPABASE_ANON_KEY") || readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") || readEnv("SUPABASE_ANON_KEY");

export const supabaseConfigured = Boolean(url && anon);

let client: SupabaseClient | null = null;

/** Browser/server singleton. Null when the public keys are not set, so Neon stays the source of truth. */
export function getSupabase(): SupabaseClient | null {
  if (!supabaseConfigured) return null;
  if (!client) client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

/** Upload a listing photo. Uses the Supabase `market-images` bucket when configured, otherwise a compressed data URL stored on the Neon listing row. */
export async function uploadListingPhoto(file: File): Promise<string> {
  if (file.size > 5 * 1024 * 1024) throw new Error("Image must be 5MB or smaller.");
  if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) throw new Error("Use JPG, PNG, or WebP.");
  const sb = getSupabase();
  if (sb) {
    const ext = file.type.includes("png") ? "png" : file.type.includes("webp") ? "webp" : "jpg";
    const path = `listings/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const up = await sb.storage.from("market-images").upload(path, file, { contentType: file.type, upsert: false });
    if (!up.error) {
      const pub = sb.storage.from("market-images").getPublicUrl(path);
      if (pub.data.publicUrl) return pub.data.publicUrl;
    }
  }
  const data = await compressPhoto(file);
  if (data.length > 900_000) throw new Error("Image is still too large after compression. Try a smaller photo.");
  return data;
}

function compressPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const max = 1200;
      const scale = Math.min(1, max / Math.max(img.width, img.height, 1));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Could not read that image."));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.72));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image."));
    };
    img.src = url;
  });
}
