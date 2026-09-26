import { useState } from "react";
import { KIND_INTERESTS, LANG_CHOICES, type AccountKind } from "@/lib/qonvo-data";

const HOBBIES = ["Music", "Football", "Film", "Fashion", "Food", "Tech", "Comedy", "Faith", "Fitness", "Business"];

export function OnboardSheet({
  kind,
  onDone,
}: {
  kind: AccountKind;
  onDone: (d: { interests?: string; langs?: string; website?: string; city?: string; skip?: boolean }) => Promise<{ ok: boolean; reason?: string }>;
}) {
  const topics = KIND_INTERESTS[kind] ?? KIND_INTERESTS.member;
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<string[]>([]);
  const [hobbies, setHobbies] = useState<string[]>([]);
  const [city, setCity] = useState("");
  const [langs, setLangs] = useState<string[]>(["en"]);
  const [site, setSite] = useState("");
  const [agree, setAgree] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  function toggle(list: string[], id: string, cap: number) {
    return list.includes(id) ? list.filter((x) => x !== id) : list.length >= cap ? list : [...list, id];
  }

  async function finish(skip = false) {
    setBusy(true);
    setErr("");
    const interests = [...picked, ...hobbies].filter((v, i, a) => a.indexOf(v) === i).slice(0, 8);
    const r = await onDone(
      skip
        ? { skip: true, langs: "en" }
        : {
            interests: interests.join(","),
            langs: langs.join(","),
            city: city.trim(),
            website: kind === "artist" ? site : undefined,
          },
    );
    setBusy(false);
    if (!r.ok) setErr(r.reason || "Could not save.");
  }

  return (
    <div className="fixed inset-0 z-[80] grid place-items-end bg-black/50 p-3 pb-[calc(4.2rem+env(safe-area-inset-bottom))] sm:place-items-center sm:pb-3">
      <div className="w-full max-w-md rounded-2xl border border-line bg-panel p-4 shadow-2xl">
        <p className="text-[10px] font-bold tracking-[0.16em] text-lime-2">STEP {step + 1} OF 4</p>
        {step === 0 ? (
          <>
            <h2 className="mt-1 text-lg font-extrabold">What do you want on Kilode?</h2>
            <p className="mt-1 text-[12px] text-muted">These match your {kind.replace("_", " ")} account. Pick up to 5. This does not change your account type.</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {topics.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`rounded-full border px-2.5 py-1 text-[12px] font-semibold ${picked.includes(t) ? "border-lime-2 bg-lime-2/15 text-lime-2" : "border-line"}`}
                  onClick={() => setPicked((p) => toggle(p, t, 5))}
                >
                  {t}
                </button>
              ))}
            </div>
          </>
        ) : null}
        {step === 1 ? (
          <>
            <h2 className="mt-1 text-lg font-extrabold">Which languages?</h2>
            <p className="mt-1 text-[12px] text-muted">English is already on. Add any others you read.</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {LANG_CHOICES.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  className={`rounded-full border px-2.5 py-1 text-[12px] font-semibold ${langs.includes(l.id) ? "border-lime-2 bg-lime-2/15 text-lime-2" : "border-line"}`}
                  onClick={() => setLangs((p) => (l.id === "en" ? p : toggle(p, l.id, 5)))}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </>
        ) : null}
        {step === 2 ? (
          <>
            <h2 className="mt-1 text-lg font-extrabold">Where are you, and what do you do for fun?</h2>
            <p className="mt-1 text-[12px] text-muted">City helps people near you. Hobbies help Socials line you up with the right fellows. Both are optional.</p>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value.slice(0, 40))}
              placeholder="City — Lagos, Abuja, London…"
              className="mt-3 w-full rounded-lg border border-line bg-bg px-3 py-2 outline-none"
              style={{ fontSize: 16 }}
            />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {HOBBIES.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`rounded-full border px-2.5 py-1 text-[12px] font-semibold ${hobbies.includes(t) ? "border-lime-2 bg-lime-2/15 text-lime-2" : "border-line"}`}
                  onClick={() => setHobbies((p) => toggle(p, t, 4))}
                >
                  {t}
                </button>
              ))}
            </div>
          </>
        ) : null}
        {step === 3 ? (
          <>
            <h2 className="mt-1 text-lg font-extrabold">Keep it human</h2>
            <p className="mt-1 text-[12px] leading-snug text-muted">No scams, no harassment, no fake listings. Your account type stays the one you picked at Join.</p>
            {kind === "artist" ? (
              <label className="mt-3 block text-[12px]">
                Song or social link (optional)
                <input
                  value={site}
                  onChange={(e) => setSite(e.target.value)}
                  placeholder="https://"
                  className="mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2 outline-none"
                  style={{ fontSize: 16 }}
                />
              </label>
            ) : null}
            <label className="mt-3 flex items-start gap-2 text-[12px]">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5" />
              I agree to the community rules.
            </label>
          </>
        ) : null}
        {err ? <p className="mt-2 text-[12px] text-danger">{err}</p> : null}
        <div className="mt-4 flex gap-2">
          {step > 0 ? (
            <button type="button" className="rounded-lg border border-line px-3 py-2 text-[12px]" onClick={() => setStep((n) => n - 1)}>
              Back
            </button>
          ) : (
            <button type="button" className="rounded-lg border border-line px-3 py-2 text-[12px] text-muted" disabled={busy} onClick={() => void finish(true)}>
              Skip
            </button>
          )}
          {step < 3 ? (
            <button type="button" className="btn-join flex-1 rounded-lg py-2 text-[12px] font-bold" onClick={() => setStep((n) => n + 1)}>
              Next
            </button>
          ) : (
            <button type="button" disabled={!agree || busy} className="btn-join flex-1 rounded-lg py-2 text-[12px] font-bold disabled:opacity-50" onClick={() => void finish(false)}>
              {busy ? "Saving" : "Enter Kilode"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
