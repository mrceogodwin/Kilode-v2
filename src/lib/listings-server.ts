import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { asAccountKind, type AccountKind, safeHttpUrl } from "@/lib/qonvo-data";
import { canKind, kindActionHint, type KindAction } from "@/lib/permissions";
import { gateText } from "@/lib/mod-cache";
import { DEMO_LISTINGS } from "@/lib/qonvo-seed";
import { applyProblems } from "@/lib/board-rules";
import { deskCharge } from "@/lib/site-server";
import { pushNote } from "@/lib/social-server";

export type ListingKind = "job" | "market" | "rent";
export type Listing = {
  id: string;
  kind: ListingKind;
  title: string;
  body: string;
  city: string;
  contact: string;
  link: string;
  company: string;
  status: "pending" | "approved" | "rejected" | "awaiting_pay";
  submitter: string;
  ts: number;
  views: number;
  days: number;
  expiresAt?: number;
  image?: string;
  meta?: string;
};

function nid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function asKind(v: string): ListingKind {
  return v === "market" || v === "rent" ? v : "job";
}

const ACTION: Record<ListingKind, KindAction> = {
  job: "jobs.post",
  market: "market.list",
  rent: "rent.list",
};

async function kindOf(userId: string): Promise<AccountKind> {
  try {
    const sql = await getSql();
    const rows = await sql<{ kind: string | null }>`select kind from nf_profiles where user_id = ${userId} limit 1`;
    return asAccountKind(rows[0]?.kind);
  } catch {
    return "member";
  }
}

async function handleOf(userId: string) {
  const sql = await getSql();
  const rows = await sql<{ handle: string }>`select handle from nf_profiles where user_id = ${userId} limit 1`;
  return (rows[0]?.handle || userId).slice(0, 24);
}

async function staffRole(userId: string) {
  const sql = await getSql();
  try {
    const rows = await sql<{ role: string }>`select role from nf_staff where user_id = ${userId} limit 1`;
    return rows[0]?.role ?? null;
  } catch {
    return null;
  }
}

async function ensure() {
  const sql = await getSql();
  await sql.query(`CREATE TABLE IF NOT EXISTS nf_listings (
    id TEXT PRIMARY KEY, kind TEXT NOT NULL, title TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '', city TEXT NOT NULL DEFAULT '',
    contact TEXT NOT NULL DEFAULT '', link TEXT NOT NULL DEFAULT '',
    company TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'pending',
    submitter TEXT NOT NULL DEFAULT '', user_id TEXT, ts BIGINT NOT NULL, views INTEGER NOT NULL DEFAULT 0,
    days INT NOT NULL DEFAULT 30, expires_at BIGINT)`);
  await sql.query(`CREATE TABLE IF NOT EXISTS nf_apps (
    id TEXT PRIMARY KEY, listing_id TEXT NOT NULL, user_id TEXT NOT NULL,
    handle TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', ts BIGINT NOT NULL)`);
  try {
    await sql.query(`ALTER TABLE nf_listings ADD COLUMN IF NOT EXISTS days INT NOT NULL DEFAULT 30`);
    await sql.query(`ALTER TABLE nf_listings ADD COLUMN IF NOT EXISTS expires_at BIGINT`);
    await sql.query(`ALTER TABLE nf_listings ADD COLUMN IF NOT EXISTS image TEXT`);
    await sql.query(`ALTER TABLE nf_listings ADD COLUMN IF NOT EXISTS meta TEXT`);
    await sql.query(`ALTER TABLE nf_apps ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT ''`);
    await sql.query(`ALTER TABLE nf_apps ADD COLUMN IF NOT EXISTS cv TEXT NOT NULL DEFAULT ''`);
    await sql.query(`ALTER TABLE nf_apps ADD COLUMN IF NOT EXISTS skills TEXT NOT NULL DEFAULT ''`);
  } catch {
    /* exists */
  }
}

type ListingRow = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  city: string | null;
  contact: string | null;
  link: string | null;
  company: string | null;
  status: string;
  submitter: string | null;
  ts: number | string;
  views: number | string | null;
  days?: number | string | null;
  expires_at?: number | string | null;
  image?: string | null;
  meta?: string | null;
};

function map(r: ListingRow): Listing {
  return {
    id: r.id,
    kind: asKind(r.kind),
    title: r.title,
    body: r.body ?? "",
    city: r.city ?? "",
    contact: r.contact ?? "",
    link: r.link ?? "",
    company: r.company ?? "",
    status: r.status === "approved" || r.status === "rejected" || r.status === "awaiting_pay" ? r.status : "pending",
    submitter: r.submitter ?? "",
    ts: Number(r.ts),
    views: Number(r.views ?? 0),
    days: Number(r.days ?? 30),
    expiresAt: r.expires_at ? Number(r.expires_at) : undefined,
    image: r.image || undefined,
    meta: r.meta || undefined,
  };
}

/** Accept https URL or compressed data:image (same pattern as Feeds / Ads). */
function normalizeListingImage(raw?: string): string {
  const v = (raw ?? "").trim();
  if (!v) return "";
  if (v.startsWith("data:image/") && v.includes(";base64,")) {
    if (v.length > 900_000) return "";
    return v;
  }
  return safeHttpUrl(v) ?? "";
}

export const listListings = createServerFn({ method: "GET" })
  .validator((d: { kind: string; staff?: boolean }) => d)
  .handler(async ({ data }) => {
    const sql = await getSql();
    try {
      await ensure();
    } catch {
      /* exists */
    }
    const kind = asKind(data.kind);
    const now = Date.now();
    const rows = await sql<ListingRow>`select id, kind, title, body, city, contact, link, company, status, submitter, ts, views, days, expires_at, image, meta from nf_listings where kind = ${kind} and status = 'approved' and (expires_at is null or expires_at > ${now}) order by ts desc limit 80`;
    const live = rows.map(map);
    if (kind === "job") return live;
    return live.length
      ? live
      : DEMO_LISTINGS.filter((l) => l.kind === kind).map((l) => ({
          id: l.id,
          kind,
          title: l.title,
          body: l.body,
          city: l.city,
          contact: l.contact,
          link: l.link,
          company: l.company,
          status: "approved" as const,
          submitter: l.submitter,
          ts: l.ts,
          views: l.views,
          days: l.days,
          image: l.image,
        }));
  });

export type ExploreTile = {
  id: string;
  kind: string;
  title: string;
  image: string;
  href: string;
  video: boolean;
  clip?: string;
};

export const listExploreGrid = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const tiles: ExploreTile[] = [];
  try {
    const posts = await sql<{ id: string; title: string | null; slug: string | null; image: string | null; link: string | null }>`
      select id, title, slug, image, link from nf_posts
      where status is distinct from ${"draft"} and image is not null and image like ${"http%"}
      order by ts desc
      limit 36`;
    for (const p of posts) {
      if (!p.image) continue;
      tiles.push({
        id: p.id,
        kind: "post",
        title: p.title || "Post",
        image: p.image,
        href: `/p/${p.slug || p.id}`,
        video: /youtu\.be|youtube\.com|vimeo\.com/i.test(p.link || ""),
      });
    }
  } catch {
    /* posts table can be missing on a fresh database */
  }
  try {
    const now = Date.now();
    const rows = await sql<{ id: string; kind: string; title: string | null; image: string | null }>`
      select id, kind, title, image from nf_listings
      where status = ${"approved"} and image is not null and length(image) > 12
        and (expires_at is null or expires_at > ${now})
      order by ts desc
      limit 36`;
    for (const r of rows) {
      const image = r.image || "";
      if (!image.startsWith("http") && !image.startsWith("data:image/")) continue;
      tiles.push({
        id: r.id,
        kind: r.kind,
        title: r.title || r.kind,
        image,
        href: r.kind === "rent" ? "/?open=rent" : r.kind === "job" ? "/?open=jobs" : "/?open=market",
        video: false,
      });
    }
  } catch {
    /* listings table can be missing */
  }
  try {
    const shots = await sql<{ id: string; handle: string | null; body: string | null; meta: string | null }>`
      select id, handle, body, meta from nf_takes
      where user_id <> ${"seed"} and id not like ${"seed-%"}
        and (meta like ${'%"image":%'} or meta like ${'%"video":%'})
      order by ts desc
      limit 24`;
    for (const row of shots) {
      let image = "";
      let clip = "";
      try {
        const meta = JSON.parse(row.meta || "{}") as { image?: string; video?: string };
        image = typeof meta.image === "string" ? meta.image : "";
        clip = typeof meta.video === "string" ? meta.video : "";
      } catch {
        image = "";
      }
      const photo = image.startsWith("http") || image.startsWith("data:image/") ? image : "";
      const film = /^https:\/\//i.test(clip) ? clip : "";
      if (!photo && !film) continue;
      tiles.unshift({
        id: row.id,
        kind: "take",
        title: (row.body || "Take").slice(0, 80),
        image: photo,
        clip: film,
        href: `/?tab=socials&take=${encodeURIComponent(row.id)}`,
        video: Boolean(film),
      });
    }
  } catch {
    /* takes table can be missing */
  }
  return tiles.slice(0, 60);
});

export const saveListing = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: {
    kind: string;
    title: string;
    body?: string;
    city?: string;
    contact?: string;
    link?: string;
    company?: string;
    days?: number;
    image?: string;
    jobType?: string;
    category?: string;
    salary?: string;
    condition?: string;
    price?: string;
    experience?: string;
    deadline?: string;
  }) => d)
  .handler(async ({ context, data }) => {
    const kind = asKind(data.kind);
    const ak = await kindOf(context.userId);
    if (!canKind(ak, ACTION[kind])) return { ok: false as const, reason: kindActionHint(ACTION[kind]) };
    const title = data.title.trim().slice(0, 120);
    if (title.length < 3) return { ok: false as const, reason: "Add a title." };
    const submitter = await handleOf(context.userId);
    const gate = await gateText("feeds", `${title} ${data.body ?? ""}`, { userId: context.userId, author: submitter });
    if (!gate.ok) return { ok: false as const, reason: gate.reason };
    const sql = await getSql();
    try {
      await ensure();
    } catch {
      /* exists */
    }
    const id = nid();
    const link = safeHttpUrl(data.link ?? "") ?? "";
    const days = [7, 14, 30].includes(Number(data.days)) ? Number(data.days) : 30;
    const image = normalizeListingImage(data.image);
    if ((data.image ?? "").trim() && !image) {
      return { ok: false as const, reason: "Photo must be https://… or a compressed image under ~900KB." };
    }
    const meta = JSON.stringify({
      jobType: (data.jobType ?? "").slice(0, 40),
      category: (data.category ?? "").slice(0, 40),
      salary: (data.salary ?? "").slice(0, 40),
      condition: (data.condition ?? "").slice(0, 40),
      price: (data.price ?? "").slice(0, 40),
      experience: (data.experience ?? "").slice(0, 40),
      deadline: (data.deadline ?? "").slice(0, 40),
    });
    const desk = kind === "job" ? "jobs" : kind;
    const charge = await deskCharge(desk).catch(() => ({ paid: false, usd: 0, cryptoEnabled: true }));
    const status = charge.paid ? "awaiting_pay" : "pending";
    await sql`insert into nf_listings (id, kind, title, body, city, contact, link, company, status, submitter, user_id, ts, views, days, image, meta)
      values (${id}, ${kind}, ${title}, ${(data.body ?? "").slice(0, 2000)}, ${(data.city ?? "").slice(0, 80)}, ${(data.contact ?? "").slice(0, 120)}, ${link}, ${(data.company ?? "").slice(0, 80)}, ${status}, ${submitter}, ${context.userId}, ${Date.now()}, ${0}, ${days}, ${image}, ${meta})`;
    return { ok: true as const, id, needsPay: charge.paid, priceUsd: charge.usd, cryptoEnabled: charge.cryptoEnabled };
  });

export const applyListing = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string; note?: string; phone?: string; cv?: string; skills?: string }) => d)
  .handler(async ({ context, data }) => {
    const ak = await kindOf(context.userId);
    if (!canKind(ak, "jobs.apply")) return { ok: false as const, reason: kindActionHint("jobs.apply") };
    const problem = applyProblems({ note: data.note, phone: data.phone, cv: data.cv, skills: data.skills });
    if (problem) return { ok: false as const, reason: problem };
    const note = (data.note ?? "").trim().slice(0, 500);
    const phone = (data.phone ?? "").replace(/[^\d+\s-]/g, "").trim().slice(0, 24);
    const cv = (data.cv ?? "").trim().slice(0, 300);
    const skills = (data.skills ?? "").trim().slice(0, 160);
    const sql = await getSql();
    const handle = await handleOf(context.userId);
    const id = nid();
    try {
      await ensure();
    } catch {
      /* exists */
    }
    const already = await sql<{ id: string }>`select id from nf_apps where listing_id = ${data.id} and user_id = ${context.userId} limit 1`;
    if (already[0]) return { ok: false as const, reason: "You already applied to this job." };
    const job = await sql<{ id: string; status: string; expires_at: number | string | null }>`select id, status, expires_at from nf_listings where id = ${data.id} and kind = 'job' limit 1`;
    if (!job[0]) return { ok: false as const, reason: "Job not found." };
    if (job[0].status !== "approved") return { ok: false as const, reason: "This job is not open for applications yet." };
    if (job[0].expires_at && Number(job[0].expires_at) < Date.now()) {
      return { ok: false as const, reason: "This job listing has expired." };
    }
    await sql`insert into nf_apps (id, listing_id, user_id, handle, note, ts, phone, cv, skills) values (${id}, ${data.id}, ${context.userId}, ${handle}, ${note}, ${Date.now()}, ${phone}, ${cv}, ${skills})`;

    // Notify poster in-app + best-effort email (contact field or Resend)
    try {
      const poster = await sql<{ user_id: string | null; title: string | null; contact: string | null; submitter: string | null }>`
        select user_id, title, contact, submitter from nf_listings where id = ${data.id} limit 1`;
      const row = poster[0];
      const jobTitle = (row?.title || "your job").slice(0, 80);
      if (row?.user_id) {
        await pushNote(row.user_id, `@${handle} applied to “${jobTitle}”`, "/?open=me");
      }
      const contact = String(row?.contact || "").trim();
      const emailTo = /@/.test(contact) && !contact.includes(" ") ? contact : "";
      const resendKey = (process.env.RESEND_API_KEY || "").trim();
      if (emailTo && resendKey) {
        const bodyLines = [
          `New application on Kilode`,
          ``,
          `Role: ${jobTitle}`,
          `Applicant: @${handle}`,
          phone ? `Phone: ${phone}` : "",
          skills ? `Skills: ${skills}` : "",
          cv ? `CV: ${cv}` : "",
          note ? `Note: ${note}` : "",
          ``,
          `Open My Space → Listings desk → Applicants on Kilode.`,
        ].filter(Boolean);
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: process.env.RESEND_FROM || "Kilode Jobs <jobs@kilode.ng>",
            to: [emailTo],
            subject: `Application · ${jobTitle} · @${handle}`,
            text: bodyLines.join("\n"),
          }),
          signal: AbortSignal.timeout(8000),
        }).catch(() => undefined);
      }
    } catch {
      /* never fail the apply because notify failed */
    }

    return { ok: true as const };
  });

export const withdrawApplication = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql<{ id: string }>`delete from nf_apps where id = ${data.id} and user_id = ${context.userId} returning id`;
    if (!rows[0]) return { ok: false as const, reason: "That application is not on this account." };
    return { ok: true as const };
  });

export const setListingStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string; status: "approved" | "rejected" }) => d)
  .handler(async ({ context, data }) => {
    const role = await staffRole(context.userId);
    if (role !== "super" && role !== "admin") throw new Error("Forbidden");
    const sql = await getSql();
    if (data.status === "approved") {
      const rows = await sql<{ days: number | string | null }>`select days from nf_listings where id = ${data.id} limit 1`;
      const days = Number(rows[0]?.days ?? 30) || 30;
      const exp = Date.now() + days * 86_400_000;
      await sql`update nf_listings set status = ${data.status}, expires_at = ${exp} where id = ${data.id}`;
    } else {
      await sql`update nf_listings set status = ${data.status} where id = ${data.id}`;
    }
    return { ok: true as const };
  });

export const listListingQueue = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    if (!(await staffRole(context.userId))) return [];
    const sql = await getSql();
    try {
      await ensure();
    } catch {
      return [];
    }
    const rows = await sql<ListingRow>`select id, kind, title, body, city, contact, link, company, status, submitter, ts, views, days, expires_at, image from nf_listings order by ts desc limit 80`;
    return rows.map(map);
  });

export const listMyListings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((d?: { kind?: string }) => d ?? {})
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    try {
      await ensure();
    } catch {
      /* exists */
    }
    const kindFilter = data.kind ? asKind(data.kind) : null;
    const rows = kindFilter
      ? await sql<ListingRow>`select id, kind, title, body, city, contact, link, company, status, submitter, ts, views, days, expires_at, image from nf_listings where user_id = ${context.userId} and kind = ${kindFilter} order by ts desc limit 40`
      : await sql<ListingRow>`select id, kind, title, body, city, contact, link, company, status, submitter, ts, views, days, expires_at, image from nf_listings where user_id = ${context.userId} order by ts desc limit 80`;
    return rows.map(map);
  });

export const seeListing = createServerFn({ method: "POST" })
  .validator((d: { id?: string }) => d)
  .handler(async ({ data }) => {
    const id = String(data.id || "").slice(0, 40);
    if (!id) return { ok: false as const };
    try {
      const sql = await getSql();
      await sql`update nf_listings set views = coalesce(views, 0) + 1 where id = ${id} and status = 'approved'`;
    } catch {
      return { ok: false as const };
    }
    return { ok: true as const };
  });

export const setOwnListing = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id?: string; action?: string }) => d)
  .handler(async ({ context, data }) => {
    const id = String(data.id || "").slice(0, 40);
    if (!id || data.action !== "close") return { ok: false as const, reason: "Pick a listing." };
    const sql = await getSql();
    const rows = await sql<{ id: string }>`update nf_listings set status = ${"closed"}, expires_at = ${Date.now()} where id = ${id} and user_id = ${context.userId} and status in ('approved', 'pending', 'awaiting_pay') returning id`;
    if (!rows[0]) return { ok: false as const, reason: "That listing is not yours, or it is already closed." };
    return { ok: true as const };
  });

export type MyApp = {
  id: string;
  listingId: string;
  title: string;
  company: string;
  city: string;
  note: string;
  phone: string;
  cv: string;
  skills: string;
  ts: number;
  status: string;
};

export const listMyApps = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    try {
      await ensure();
    } catch {
      return [] as MyApp[];
    }
    const rows = await sql<{
      id: string;
      listing_id: string;
      note: string | null;
      phone: string | null;
      cv: string | null;
      skills: string | null;
      ts: number | string;
      title: string | null;
      company: string | null;
      city: string | null;
      status: string | null;
    }>`select a.id, a.listing_id, a.note, a.phone, a.cv, a.skills, a.ts, l.title, l.company, l.city, l.status
      from nf_apps a
      left join nf_listings l on l.id = a.listing_id
      where a.user_id = ${context.userId}
      order by a.ts desc limit 40`;
    return rows.map((r) => ({
      id: r.id,
      listingId: r.listing_id,
      title: r.title || "",
      company: r.company || "",
      city: r.city || "",
      note: r.note || "",
      phone: r.phone || "",
      cv: r.cv || "",
      skills: r.skills || "",
      ts: Number(r.ts),
      status: r.status || "",
    }));
  });

export type MyApplicant = {
  id: string;
  listingId: string;
  handle: string;
  title: string;
  note: string;
  phone: string;
  cv: string;
  skills: string;
  ts: number;
};

export const listMyApplicants = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    try {
      await ensure();
    } catch {
      return [] as MyApplicant[];
    }
    const rows = await sql<{
      id: string;
      listing_id: string;
      handle: string;
      note: string | null;
      phone: string | null;
      cv: string | null;
      skills: string | null;
      ts: number | string;
      title: string | null;
    }>`select a.id, a.listing_id, a.handle, a.note, a.phone, a.cv, a.skills, a.ts, l.title
      from nf_apps a
      join nf_listings l on l.id = a.listing_id
      where l.user_id = ${context.userId}
      order by a.ts desc limit 80`;
    return rows.map((r) => ({
      id: r.id,
      listingId: r.listing_id,
      handle: r.handle,
      title: r.title || "",
      note: r.note || "",
      phone: r.phone || "",
      cv: r.cv || "",
      skills: r.skills || "",
      ts: Number(r.ts),
    }));
  });

export const updateListing = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string; title?: string; body?: string; city?: string; contact?: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const title = (data.title ?? "").trim().slice(0, 120);
    const body = (data.body ?? "").slice(0, 2000);
    const city = (data.city ?? "").slice(0, 80);
    const contact = (data.contact ?? "").slice(0, 120);
    const rows = await sql<{ id: string }>`update nf_listings set title = coalesce(nullif(${title}, ''), title), body = ${body}, city = ${city}, contact = ${contact}
      where id = ${data.id} and user_id = ${context.userId} returning id`;
    if (!rows[0]) return { ok: false as const, reason: "Listing not found." };
    return { ok: true as const };
  });

export const deleteListing = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql<{ id: string }>`delete from nf_listings where id = ${data.id} and user_id = ${context.userId} returning id`;
    if (!rows[0]) return { ok: false as const, reason: "Listing not found." };
    await sql`delete from nf_apps where listing_id = ${data.id}`;
    return { ok: true as const };
  });
