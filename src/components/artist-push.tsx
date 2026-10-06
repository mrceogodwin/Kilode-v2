import { useEffect, useRef, useState } from "react";
import { appleTrackId, artworkFromLookup, artworkSearchUrl, pushNetwork, pushUsd } from "@/lib/artist-rules";
import { listLivePushes, listMyPushes, listMyPayouts, listPresaves, releasePresave, requestPayout, savePresave, savePush, seePush, setPushState, wantPresave, type PushCard } from "@/lib/artist-server";
import { listPayMethods } from "@/lib/pay-gateways";
import { GatewayPay } from "@/components/pay-checkout";
import type { PayProvider } from "@/lib/pay-money";
import { Tip } from "@/components/tip";
import { timeLeftLabel } from "@/lib/qonvo-data";

export function ArtFace({ name, cover, url, big = false }: { name: string; cover?: string; url?: string; big?: boolean }) {
  const [src, setSrc] = useState(cover || "");
  const tried = useRef("");
  useEffect(() => {
    setSrc(cover || "");
    tried.current = "";
  }, [cover, url]);
  useEffect(() => {
    if (src) return;
    const id = appleTrackId(url || "");
    const lookup = id ? `https://itunes.apple.com/lookup?id=${id}` : artworkSearchUrl(name);
    if (!lookup || tried.current === lookup) return;
    tried.current = lookup;
    const stop = new AbortController();
    fetch(lookup, { signal: stop.signal })
      .then((r) => r.json())
      .then((j) => {
        const art = artworkFromLookup(j);
        if (art) setSrc(art);
      })
      .catch(() => undefined);
    return () => stop.abort();
  }, [src, url, name]);
  return (
    <span className={big ? "artist-hero-face" : "artist-orb-face"}>
      {src ? (
        <img
          src={src}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setSrc("")}
        />
      ) : (
        (name || "?").slice(0, 1).toUpperCase()
      )}
    </span>
  );
}

export function PushStrip() {
  const [rows, setRows] = useState<PushCard[]>([]);
  useEffect(() => {
    void listLivePushes().then((list) => {
      const rows = Array.isArray(list) ? list : [];
      setRows(rows);
      for (const row of rows) {
        const key = `kilode-push-seen-${row.id}`;
        try {
          if (sessionStorage.getItem(key)) continue;
          sessionStorage.setItem(key, "1");
        } catch {
          continue;
        }
        void seePush({ data: { id: row.id, kind: "view" } });
      }
    }).catch(() => setRows([]));
  }, []);
  if (!rows.length) return null;
  return (
    <div className="push-strip">
      {rows.map((row) => (
        <a
          key={row.id}
          className="push-card"
          href={row.url}
          target="_blank"
          rel="noreferrer"
          onClick={() => void seePush({ data: { id: row.id } })}
        >
          <ArtFace name={row.handle} cover={row.cover} url={row.url} />
          <span>
            <b>Promoted · {row.network}</b>
            <strong>{row.title}</strong>
            <em>@{row.handle} · {timeLeftLabel(row.expiresAt)}</em>
            {row.note ? <em>{row.note}</em> : null}
          </span>
        </a>
      ))}
    </div>
  );
}

export function PushDesk({ artist }: { artist: boolean }) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [city, setCity] = useState("");
  const [age, setAge] = useState("");
  const [days, setDays] = useState<1 | 3 | 7>(3);
  const [payWith, setPayWith] = useState<PayProvider>("paystack");
  const [gate, setGate] = useState({ paystack: false, flutterwave: false, nowpayments: false, ngnPerUsd: 1600 });
  const [err, setErr] = useState("");
  const [done, setDone] = useState("");
  const [tick, setTick] = useState(0);
  const [step, setStep] = useState(1);
  const [mine, setMine] = useState<{ id: string; title: string; note: string; network: string; url: string; cover: string; city: string; age: string; clicks: number; views: number; status: string; expiresAt: number; days: number; receipt?: string }[]>([]);
  const [bag, setBag] = useState<"all" | "live" | "paused" | "ended">("all");
  const [preview, setPreview] = useState("");
  const [drops, setDrops] = useState<{ id: string; title: string; artist: string; whenLabel: string; interests: number }[]>([]);
  const [payouts, setPayouts] = useState<{ id: string; note: string; status: string }[]>([]);
  const [whenLabel, setWhenLabel] = useState("");
  const [payNote, setPayNote] = useState("");
  const [tool, setTool] = useState("");
  useEffect(() => {
    void listPayMethods().then((m) => setGate({ paystack: m.paystack, flutterwave: m.flutterwave, nowpayments: m.nowpayments, ngnPerUsd: m.ngnPerUsd })).catch(() => undefined);
    void listMyPushes().then((rows) => setMine(Array.isArray(rows) ? rows.map((r) => ({ ...r, url: r.url || "", note: r.note || "", cover: r.cover || "", city: r.city || "", age: r.age || "", views: r.views || 0, days: r.days || 0, receipt: r.receipt || "" })) : [])).catch(() => setMine([]));
    void listPresaves().then((rows) => setDrops(Array.isArray(rows) ? rows.map((r) => ({ id: r.id, title: r.title, artist: r.artist, whenLabel: r.whenLabel, interests: r.interests })) : [])).catch(() => setDrops([]));
    void listMyPayouts().then((rows) => setPayouts(Array.isArray(rows) ? rows : [])).catch(() => setPayouts([]));
  }, [done, tick]);
  if (!artist) return <p className="ad-note">Push is for Artist accounts. A pushed link is a paid card on Socials.</p>;
  const link = pushNetwork(url);
  const usd = pushUsd(days);
  const nets = ["Spotify", "Apple Music", "YouTube", "Audiomack", "SoundCloud", "Deezer", "Boomplay", "Instagram", "TikTok", "X"];
  return (
    <section className="push-desk">
      <div className="push-steps">
        {["Link", "Line", "People", "Pay"].map((label, i) => (
          <button key={label} type="button" className={step === i + 1 ? "on" : ""} onClick={() => setStep(i + 1)}>{i + 1} {label}</button>
        ))}
      </div>
      {step === 1 ? (
        <>
          <Tip text="Paste a supported link. Kilode does not host the audio." />
          <div className="ad-pills">
            {nets.map((name) => <span key={name} className="ad-note">{name}</span>)}
          </div>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" className="ad-field" />
          {link ? <p className="ad-note">{link.network}</p> : url.trim() ? <p className="ad-err">That link is not a supported music or social page.</p> : null}
          <button type="button" className="push-next" disabled={!link} onClick={() => setStep(2)}>Next</button>
        </>
      ) : null}
      {step === 2 ? (
        <>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="ad-field" />
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={140} placeholder="One line, optional" className="ad-field" />
          <button type="button" className="push-next" disabled={!title.trim()} onClick={() => setStep(3)}>Next</button>
        </>
      ) : null}
      {step === 3 ? (
        <>
          <Tip text="City and age are what you ask for. They are not measured results." />
          <input value={city} onChange={(e) => setCity(e.target.value)} maxLength={40} placeholder="City, optional" className="ad-field" />
          <input value={age} onChange={(e) => setAge(e.target.value)} maxLength={24} placeholder="Age, optional" className="ad-field" />
          <button type="button" className="push-next" onClick={() => setStep(4)}>Next</button>
        </>
      ) : null}
      {step === 4 ? (
        <>
          <div className="ad-pills">
            {([1, 3, 7] as const).map((n) => (
              <button key={n} type="button" className={days === n ? "on" : ""} onClick={() => setDays(n)}>{n} day{n > 1 ? "s" : ""} · ${pushUsd(n)}</button>
            ))}
          </div>
          {title.trim() && link ? (
            <div className="push-card">
              <ArtFace name={title} url={link.url} />
              <span><b>Preview</b><strong>{title}</strong><em>{link.network} · ${usd}</em></span>
            </div>
          ) : null}
          <div className="ad-pills">
            {(["paystack", "flutterwave", "nowpayments"] as const).map((id) => (
              <button key={id} type="button" className={payWith === id ? "on" : ""} onClick={() => setPayWith(id)}>{id === "nowpayments" ? "Crypto" : id === "paystack" ? "Paystack" : "Flutterwave"}</button>
            ))}
          </div>
          <GatewayPay
            provider={payWith}
            kind="push"
            purpose={`push-${days}`}
            usd={usd}
            rate={gate.ngnPerUsd}
            ready={payWith === "paystack" ? gate.paystack : payWith === "flutterwave" ? gate.flutterwave : gate.nowpayments}
            onPaid={(paid) => {
              void savePush({ data: { title, note, url, days, city, age, txHash: paid.reference } }).then((r) => {
                if (!r.ok) setErr("reason" in r ? r.reason : "Could not place the link.");
                else {
                  setDone(title);
                  setTitle("");
                  setUrl("");
                  setNote("");
                  setErr("");
                  setStep(1);
                }
              });
            }}
          />
          <p className="ad-note">It goes live only after the payment confirms. One live push at a time.</p>
        </>
      ) : null}
      {err ? <p className="ad-err">{err}</p> : null}
      {done ? <p className="ad-note">{done} is on Socials.</p> : null}
      {mine.length ? (
        <div className="ad-list">
          <div className="push-tools">
            {(["all", "live", "paused", "ended"] as const).map((id) => (
              <button key={id} type="button" className={bag === id ? "on" : ""} onClick={() => setBag(id)}>{id}</button>
            ))}
          </div>
          {mine.filter((row) => {
            const ended = row.status === "ended" || row.expiresAt <= Date.now();
            if (bag === "live") return row.status === "live" && !ended;
            if (bag === "paused") return row.status === "paused";
            if (bag === "ended") return ended;
            return true;
          }).map((row) => {
            const rate = row.views > 0 ? Math.round((row.clicks / row.views) * 100) : null;
            const ended = row.status === "ended" || row.expiresAt <= Date.now();
            return (
              <div key={row.id} className="ad-card">
                <div className="flex items-center gap-2">
                  <ArtFace name={row.title} cover={row.cover} url={row.url} />
                  <span className="min-w-0">
                    <strong>{row.title}</strong>
                    <em>{row.status} · {row.network} · {row.days || "?"}d · {row.views} seen · {row.clicks} opens{rate == null ? "" : ` · ${rate}% open rate`} · {ended ? "Ended" : timeLeftLabel(row.expiresAt)}</em>
                    {row.note ? <em>{row.note}</em> : null}
                    {row.city || row.age ? <em>Audience · {[row.city, row.age].filter(Boolean).join(" · ")}</em> : null}
                    <em>Receipt {row.receipt ? row.receipt.slice(0, 14) : row.id.slice(0, 10)}</em>
                  </span>
                </div>
                {preview === row.id ? (
                  <a className="push-card" href={row.url} target="_blank" rel="noreferrer">
                    <ArtFace name={row.title} cover={row.cover} url={row.url} />
                    <span>
                      <b>Promoted · {row.network}</b>
                      <strong>{row.title}</strong>
                      <em>This is the card Socials shows.</em>
                    </span>
                  </a>
                ) : null}
                <div className="push-tools">
                  <button type="button" onClick={() => { void navigator.clipboard?.writeText(row.url); setTool("Copied"); }}>Copy</button>
                  <button type="button" onClick={() => { void navigator.clipboard?.writeText(`${row.title}\n${row.url}`); setTool("Line copied"); }}>Line</button>
                  <button type="button" onClick={() => { if (navigator.share) void navigator.share({ title: row.title, url: row.url }); else window.open(row.url, "_blank", "noopener"); }}>Share</button>
                  <a href={row.url} target="_blank" rel="noreferrer">Open</a>
                  <button type="button" onClick={() => setPreview((id) => (id === row.id ? "" : row.id))}>{preview === row.id ? "Hide" : "Preview"}</button>
                  <button type="button" onClick={() => { setTitle(row.title); setUrl(row.url); setNote(row.note); setCity(row.city); setAge(row.age); if (row.days === 1 || row.days === 3 || row.days === 7) setDays(row.days); setStep(1); setTool("Copied into a new draft. It is not live until you pay."); }}>Use again</button>
                  {row.status === "live" && !ended ? <button type="button" onClick={() => void setPushState({ data: { id: row.id, action: "pause" } }).then((r) => { setTool(r.ok ? "Paused. It is off Socials until you resume." : r.reason); if (r.ok) setTick((n) => n + 1); })}>Pause</button> : null}
                  {row.status === "paused" && !ended ? <button type="button" onClick={() => void setPushState({ data: { id: row.id, action: "resume" } }).then((r) => { setTool(r.ok ? "Live again" : r.reason); if (r.ok) setTick((n) => n + 1); })}>Resume</button> : null}
                  {!ended ? <button type="button" onClick={() => { if (!window.confirm("End this push now? This does not refund the payment.")) return; void setPushState({ data: { id: row.id, action: "end" } }).then((r) => { setTool(r.ok ? "Ended" : r.reason); if (r.ok) setTick((n) => n + 1); }); }}>End</button> : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : <p className="ad-note">No push yet. A paid link is the only thing that appears on Socials.</p>}
      <div className="push-power">
        <div className="act-kicker">Drop</div>
        <input value={whenLabel} onChange={(e) => setWhenLabel(e.target.value)} placeholder="Date, like 18 Oct" className="ad-field" />
        <button type="button" className="push-next" onClick={() => {
          void savePresave({ data: { title, whenLabel, url } }).then((r) => {
            setTool(r.ok ? "Drop is open" : ("reason" in r ? r.reason : "Could not save the drop"));
            if (r.ok) void listPresaves().then((rows) => setDrops(rows.map((d) => ({ id: d.id, title: d.title, artist: d.artist, whenLabel: d.whenLabel, interests: d.interests }))));
          });
        }}>Save pre-save</button>
        {drops.map((d) => (
          <div key={d.id} className="ad-card">
            <strong>{d.title}</strong>
            <em>{d.artist} · {d.whenLabel} · {d.interests} waiting</em>
            <div className="push-tools">
              <button type="button" onClick={() => void wantPresave({ data: { id: d.id } }).then(() => listPresaves().then((rows) => setDrops(rows.map((x) => ({ id: x.id, title: x.title, artist: x.artist, whenLabel: x.whenLabel, interests: x.interests })))))}>Want</button>
              <button type="button" onClick={() => void releasePresave({ data: { id: d.id } }).then((r) => setTool(r.ok ? `Told ${r.told}` : r.reason))}>Release</button>
            </div>
          </div>
        ))}
        <div className="act-kicker">Payout</div>
        <input value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="Bank or wallet" className="ad-field" />
        <button type="button" className="push-next" onClick={() => void requestPayout({ data: { note: payNote } }).then((r) => { setTool(r.ok ? "Payout asked" : r.reason); if (r.ok) void listMyPayouts().then(setPayouts); })}>Ask payout</button>
        {payouts.map((p) => <p key={p.id} className="ad-note">{p.status} · {p.note}</p>)}
      </div>
      {tool ? <p className="ad-note">{tool}</p> : null}
    </section>
  );
}
