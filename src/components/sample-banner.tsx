const SAMPLES = [
  { key: "nike", name: "NIKE", line: "Just do it.", tone: "dark" },
  { key: "airtel", name: "airtel", line: "The smartphone network.", tone: "red" },
  { key: "mtn", name: "MTN", line: "Everywhere you go.", tone: "yellow" },
  { key: "spotify", name: "Spotify", line: "A new drop from the artist.", tone: "green" },
] as const;

function hash(s: string) {
  let n = 0;
  for (let i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) >>> 0;
  return n;
}

export function SampleBanner({ id = "ad", tall = false }: { id?: string; tall?: boolean }) {
  const pick = SAMPLES[Math.abs(hash(id)) % SAMPLES.length];
  return (
    <a href="/advertise" className={`sample-ad tone-${pick.tone} ${tall ? "tall" : ""}`}>
      <i>Sample</i>
      <b>{pick.name}</b>
      <span>{pick.line}</span>
    </a>
  );
}
