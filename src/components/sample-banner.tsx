const CREATIVES = [
  { src: "/ads/nike.jpg", name: "Nike" },
  { src: "/ads/mtn.jpg", name: "MTN" },
  { src: "/ads/spotify.jpg", name: "Spotify" },
  { src: "/ads/spotify-street.jpg", name: "Spotify" },
] as const;

function hash(s: string) {
  let n = 0;
  for (let i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) >>> 0;
  return n;
}

export function SampleBanner({ id = "ad", tall = false }: { id?: string; tall?: boolean }) {
  const pick = CREATIVES[Math.abs(hash(id)) % CREATIVES.length];
  return (
    <a href="/advertise" className={`sample-ad ${tall ? "tall" : ""}`} aria-label={`${pick.name} sample`}>
      <img src={pick.src} alt="" />
      <i>Sample</i>
    </a>
  );
}
