import { useEffect, useRef, useState } from "react";
import { appleTrackId, artworkFromLookup, artworkSearchUrl, pushNetwork, pushUsd } from "@/lib/artist-rules";
import { listLivePushes, listMyPushes, savePush, seePush, type PushCard } from "@/lib/artist-server";
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
            <b>Push · {row.network}</b>
            <strong>{row.title}</strong>
            <em>@{row.handle} · {timeLeftLabel(row.expiresAt)}</em>
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
  const [step, setStep] = useState(1);
  const [mine, setMine] = useState<{ id: string; title: string; network: string; clicks: number; status: string; expiresAt: number }[]>([]);
  useEffect(() => {
    void listPayMethods().then((m) => setGate({ paystack: m.paystack, flutterwave: m.flutterwave, nowpayments: m.nowpayments, ngnPerUsd: m.ngnPerUsd })).catch(() => undefined);
    void listMyPushes().then((rows) => setMine(Array.isArray(rows) ? rows : [])).catch(() => setMine([]));
  }, [done]);
  if (!artist) return <p className="ad-note">Push is for Artist accounts. A pushed link is a paid card on Socials.</p>;
  const link = pushNetwork(url);
  const usd = pushUsd(days);
  const nets = ["Spotify", "Apple Music", "YouTube", "Audiomack", "SoundCloud", "Instagram", "TikTok", "X"];
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
          {mine.map((row) => (
            <div key={row.id} className="ad-card">
              <strong>{row.title}</strong>
              <em>{row.status} · {row.network} · {row.clicks} opens · {row.expiresAt > Date.now() ? timeLeftLabel(row.expiresAt) : "Ended"}</em>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
