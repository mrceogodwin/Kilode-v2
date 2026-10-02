import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { prepareTakeUpload } from "@/lib/media-server";

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
  if (file.size > 7 * 1024 * 1024) throw new Error("Image must be 7MB or smaller.");
  if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) throw new Error("Use JPG, PNG, or WebP.");
  const stored = await putInBucket(file, "listings");
  if (stored) return stored;
  const data = await compressPhoto(file);
  if (data.length > 900_000) throw new Error("Image is still too large after compression. Try a smaller photo.");
  return data;
}

const IMAGE_CAP = 7 * 1024 * 1024;
const VIDEO_CAP = 20 * 1024 * 1024;
const VIDEO_SECONDS = 15;

function mediaSeconds(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const seconds = video.duration;
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(seconds) ? seconds : 0);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that video."));
    };
    video.src = url;
  });
}

/** Photo (7MB) or video (20MB, 15 seconds) for a take. The file is stored in Supabase. Neon only keeps the link. */
export async function uploadTakeMedia(file: File): Promise<{ kind: "image" | "video"; url: string }> {
  const video = file.type.startsWith("video/") || /\.(mp4|webm|mov)$/i.test(file.name);
  const image = !video && (file.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name));
  if (!image && !video) throw new Error("Use a photo or a video.");
  if (image && file.size > IMAGE_CAP) throw new Error("Image must be 7MB or smaller.");
  if (video && file.size > VIDEO_CAP) throw new Error("Video must be 20MB or smaller.");
  let body: Blob = file;
  let type = file.type || (video ? "video/mp4" : "image/jpeg");
  let ext = video ? (type.includes("webm") ? "webm" : type.includes("quicktime") ? "mov" : "mp4") : "jpg";
  if (video) {
    const seconds = await mediaSeconds(file);
    if (seconds > VIDEO_SECONDS + 0.25) throw new Error("Video must be 15 seconds or shorter.");
  } else {
    try {
      body = await shrinkJpeg(file);
      type = "image/jpeg";
      ext = "jpg";
    } catch {
      if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) throw new Error("This phone sent a photo format Kilode cannot read. Choose a JPG.");
    }
  }
  const ticket = await prepareTakeUpload({ data: { ext, type } });
  if (ticket.ok) {
    const form = new FormData();
    form.append("cacheControl", "3600");
    form.append("", body, `upload.${ext}`);
    const headers: Record<string, string> = { "x-upsert": "false" };
    if (ticket.apikey) {
      headers.apikey = ticket.apikey;
      headers.Authorization = `Bearer ${ticket.apikey}`;
    }
    const target = `${ticket.endpoint}/object/upload/sign/${ticket.path}?token=${encodeURIComponent(ticket.token)}`;
    const sent = await fetch(target, { method: "PUT", body: form, headers });
    if (sent.ok && ticket.publicUrl) return { kind: video ? "video" : "image", url: ticket.publicUrl };
    const detail = await sent.text().catch(() => "");
    if (video) throw new Error(detail.slice(0, 180) || "Supabase refused the video. Check the market-images bucket is public.");
  } else if (video) {
    throw new Error(ticket.reason);
  }
  if (video) throw new Error("Video did not reach Supabase. Check the bucket is public, then try again.");
  const data = body.type === "image/jpeg" ? await blobToData(body) : await compressPhoto(file);
  if (data.length > 140_000) throw new Error(ticket.ok ? "That photo is still too large after compression." : ticket.reason);
  return { kind: "image", url: data };
}

function blobToData(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read"));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(blob);
  });
}

function shrinkJpeg(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const max = 1280;
      const scale = Math.min(1, max / Math.max(img.width, img.height, 1));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("canvas"));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("blob"))),
        "image/jpeg",
        0.72,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("img"));
    };
    img.src = url;
  });
}

async function putInBucket(file: File, folder: string): Promise<string> {
  const sb = getSupabase();
  if (!sb) return "";
  const ext = file.type.includes("png")
    ? "png"
    : file.type.includes("webp")
      ? "webp"
      : file.type.includes("webm")
        ? "webm"
        : file.type.includes("quicktime")
          ? "mov"
          : file.type.startsWith("video/")
            ? "mp4"
            : "jpg";
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  for (const bucket of ["take-media", "market-images"]) {
    const up = await sb.storage.from(bucket).upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
    if (!up.error) {
      const pub = sb.storage.from(bucket).getPublicUrl(path);
      if (pub.data.publicUrl) return pub.data.publicUrl;
    }
  }
  return "";
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
