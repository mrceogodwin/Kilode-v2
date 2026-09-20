import { useState } from "react";
import { HOWTO, HOWTO_MORE } from "@/lib/legal";

const SHOT: Record<string, string[]> = {
  guest: ["Open Feeds, Chat, Music, Cinema, Ads without an account.", "Me, Create, Messages stay locked until you Join."],
  member: ["Pick Normal user at Join. Chat, comment, vote, apply to jobs.", "You cannot list music, place ads, or submit movies."],
  writer: ["Feeds is your desk: title, body, image, tags, SEO.", "You are the publisher. Kilode is not the editor."],
  artist: ["Paste a Spotify / SoundCloud / Audiomack URL. We embed their player.", "No audio files on Kilode. Artwork comes from that platform."],
  advertiser: ["Choose a slot, image size, 7/14/30 days. Pay crypto. Paste the tx.", "Staff approve. Status shows on your Ads screen — not by email."],
  cinema: ["Submit a YouTube URL. Staff approve. People vote once a day.", "Watching Now is an embed. We do not host the file."],
  job_poster: ["List a job with a contact link. Staff approve first."],
  job_seeker: ["Apply from the Jobs board with your handle."],
  vendor: ["Showcase a product + contact. No cart on Kilode."],
  renter: ["List a space + contact. No deposits inside the app."],
  brand: ["Company page plus the same ads path as Ads Poster."],
};

function Frame({ kind }: { kind: string }) {
  return (
    <div className="shot-phone" aria-hidden>
      <div className="shot-bar" />
      {kind === "guest" || kind === "writer" || kind === "member" ? (
        <div className="grid grid-cols-3 gap-0.5 p-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-sm bg-white/10">
              <div className="h-6 bg-lime-2/20" />
              <div className="m-0.5 h-1 rounded bg-white/30" />
            </div>
          ))}
        </div>
      ) : kind === "artist" ? (
        <div className="flex items-center gap-1 p-2">
          <div className="size-8 rounded-full bg-lime-2/40" />
          <div className="h-2 flex-1 rounded bg-white/25" />
        </div>
      ) : kind === "cinema" ? (
        <div className="p-1">
          <div className="h-12 rounded bg-black/50" />
          <div className="mt-1 h-3 rounded bg-lime-2/30" />
        </div>
      ) : kind === "advertiser" || kind === "brand" ? (
        <div className="grid grid-cols-2 gap-0.5 p-1">
          <div className="h-10 rounded bg-white/10" />
          <div className="h-10 rounded bg-white/10" />
        </div>
      ) : (
        <div className="space-y-1 p-2">
          <div className="h-3 rounded bg-white/15" />
          <div className="h-3 rounded bg-white/10" />
          <div className="h-4 rounded bg-lime-2/30" />
        </div>
      )}
    </div>
  );
}

export function HowToGuide() {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="mt-4 space-y-3">
      {HOWTO.map((h) => {
        const more = HOWTO_MORE[h.id] ?? [];
        const expanded = open === h.id;
        return (
          <article key={h.id} id={`howto-${h.id}`} className="raised overflow-hidden rounded-2xl">
            <div className="flex gap-3 p-3">
              <Frame kind={h.id} />
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-extrabold">{h.title}</h3>
                <p className="mt-1 text-[13px] leading-6 text-muted">{h.body}</p>
                <ul className="mt-2 space-y-1 text-[12px] text-fg/80">
                  {(SHOT[h.id] ?? []).map((s) => (
                    <li key={s} className="flex gap-2">
                      <span className="mt-1 size-1.5 shrink-0 rounded-full bg-lime-2" />
                      {s}
                    </li>
                  ))}
                </ul>
                {expanded ? (
                  <ol className="mt-3 list-decimal space-y-1.5 pl-4 text-[12px] leading-5 text-fg/90">
                    {more.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ol>
                ) : null}
                <button
                  type="button"
                  className="mt-3 rounded-full border border-lime-2/40 px-3 py-1 text-[11px] font-bold text-lime-2"
                  onClick={() => setOpen(expanded ? null : h.id)}
                >
                  {expanded ? "Hide" : "READ MORE"}
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
