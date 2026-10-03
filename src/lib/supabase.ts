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

function mediaSeconds(file: Blob): Promise<number> {
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

export function readVideoSeconds(file: Blob) {
  return mediaSeconds(file);
}

/** Keep `seconds` of a longer clip, starting at `start`. Kilode does this when a take video is over the limit. */
export async function trimTakeVideo(file: File, start: number, seconds: number): Promise<Blob> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;
  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("Could not read that video."));
    });
    const from = Math.max(0, Math.min(start, Math.max(0, (video.duration || 0) - seconds)));
    const width = Math.min(720, video.videoWidth || 720);
    const height = Math.max(2, Math.round(width * ((video.videoHeight || 1280) / (video.videoWidth || 720))));
    const canvas = document.createElement("canvas");
    canvas.width = width - (width % 2);
    canvas.height = height - (height % 2);
    const ctx = canvas.getContext("2d");
    if (!ctx || typeof canvas.captureStream !== "function" || typeof MediaRecorder === "undefined") {
      throw new Error("This phone cannot trim video. Cut it shorter and try again.");
    }
    const canvasStream = canvas.captureStream(24);
    const captured = (video as HTMLVideoElement & { captureStream?: () => MediaStream }).captureStream?.();
    const audio = captured?.getAudioTracks?.()[0];
    if (audio) canvasStream.addTrack(audio);
    const mime = ["video/webm;codecs=vp8,opus", "video/webm;codecs=vp8", "video/webm", "video/mp4"].find((t) => MediaRecorder.isTypeSupported(t)) || "";
    const rec = new MediaRecorder(canvasStream, mime ? { mimeType: mime } : undefined);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    const stopped = new Promise<Blob>((resolve) => {
      rec.onstop = () => resolve(new Blob(chunks, { type: rec.mimeType || "video/webm" }));
    });
    video.currentTime = from;
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
    });
    video.muted = true;
    rec.start(200);
    await video.play();
    await new Promise<void>((resolve) => {
      const stop = () => {
        video.pause();
        if (rec.state !== "inactive") rec.stop();
        resolve();
      };
      const tick = () => {
        if (video.ended || video.currentTime >= from + seconds - 0.04) {
          stop();
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        requestAnimationFrame(tick);
      };
      tick();
      window.setTimeout(stop, (seconds + 0.6) * 1000);
    });
    const blob = await stopped;
    if (blob.size < 800) throw new Error("Trim failed. Tap Keep this part, or cut the clip on your phone.");
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Photo (7MB) or video (20MB, trimmed to the staff limit) for a take. The file is stored in Supabase. Neon only keeps the link. */
export async function uploadTakeMedia(file: File, limits?: { maxSeconds?: number }): Promise<{ kind: "image" | "video"; url: string }> {
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
    const cap = limits?.maxSeconds && limits.maxSeconds > 0 ? limits.maxSeconds : VIDEO_SECONDS;
    if (seconds > cap + 0.4) throw new Error(`Video must be ${Math.round(cap)} seconds or shorter.`);
  } else {
    try {
      body = await shrinkJpeg(file);
      type = "image/jpeg";
      ext = "jpg";
    } catch {
      if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) throw new Error("This phone sent a photo format Kilode cannot read. Choose a JPG.");
    }
  }
  const safeType = (type || (video ? "video/mp4" : "image/jpeg")).replace(/[^\w.+/-]/g, "") || (video ? "video/mp4" : "image/jpeg");
  const ticket = await prepareTakeUpload({ data: { ext, type: safeType } });
  if (ticket.ok) {
    try {
      const sent = await putSignedUpload(ticket, body, safeType, ext);
      if (sent.ok && ticket.publicUrl) return { kind: video ? "video" : "image", url: ticket.publicUrl };
      const detail = await sent.text().catch(() => "");
      if (video) throw new Error(detail.slice(0, 180) || "Supabase refused the video. Check the market-images bucket is public.");
    } catch (e) {
      const raw = e instanceof Error ? e.message : "";
      if (video) {
        throw new Error(/bytestring|8288/i.test(raw) ? "This phone blocked the video upload. Try a shorter clip." : raw || "Video did not reach Supabase.");
      }
    }
  } else if (video) {
    throw new Error(ticket.reason);
  }
  if (video) throw new Error("Video did not reach Supabase. Check the bucket is public, then try again.");
  const data = body.type === "image/jpeg" ? await blobToData(body) : await compressPhoto(file);
  if (data.length > 140_000) throw new Error(ticket.ok ? "That photo is still too large after compression." : ticket.reason);
  return { kind: "image", url: data };
}

function latinHeader(value: string) {
  let out = "";
  for (let i = 0; i < value.length; i++) {
    if (value.charCodeAt(i) <= 255) out += value[i];
  }
  return out;
}

/** Signed upload without FormData. iOS puts a word-joiner (U+2060) on photo names, and WebKit then throws ByteString 8288. */
async function putSignedUpload(
  ticket: { path: string; token: string; apikey?: string; endpoint: string },
  file: Blob,
  mime: string,
  ext: string,
) {
  const boundary = `Kilode${Date.now().toString(16)}`;
  const type = latinHeader(mime || "application/octet-stream") || "application/octet-stream";
  const name = `upload.${latinHeader(ext).replace(/[^\w]/g, "") || "bin"}`;
  const bytes = file instanceof File ? new Blob([await file.arrayBuffer()], { type }) : file;
  const head =
    `--${boundary}\r\nContent-Disposition: form-data; name="cacheControl"\r\n\r\n3600\r\n` +
    `--${boundary}\r\nContent-Disposition: form-data; name=""; filename="${name}"\r\nContent-Type: ${type}\r\n\r\n`;
  const body = new Blob([head, bytes, `\r\n--${boundary}--\r\n`]);
  const headers = new Headers();
  headers.set("content-type", `multipart/form-data; boundary=${boundary}`);
  headers.set("x-upsert", "false");
  const key = latinHeader(ticket.apikey || "");
  if (key) {
    headers.set("apikey", key);
    headers.set("authorization", `Bearer ${key}`);
  }
  const path = ticket.path.split("/").map((part) => encodeURIComponent(part)).join("/");
  const token = encodeURIComponent(latinHeader(ticket.token));
  return fetch(`${ticket.endpoint}/object/upload/sign/${path}?token=${token}`, { method: "PUT", body, headers });
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
