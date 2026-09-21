import { chromium } from "playwright";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const OUT = "/workspace/public/howto";
const PORT = process.env.PREVIEW_PORT || "8080";
const BASE = `http://127.0.0.1:${PORT}`;
mkdirSync(OUT, { recursive: true });

const SCENES = [
  { file: "feeds.jpg", title: "Feeds", body: "News in a 4-column grid. Open a story for comments, related posts, and Top 10.", ready: '[data-feed-card="1"]' },
  { file: "chat.jpg", tab: "Chat", title: "Forum", body: "Live rooms. Messages expire on a clock Super sets. No links or phone numbers.", ready: 'button[aria-label="Older messages"]' },
  { file: "cinema.jpg", tab: "Cinema", title: "Cinema", body: "Watch a YouTube title together. Vote, rate 1–5, take the A–E quiz.", readyText: "Watching now" },
  { file: "ads.jpg", tab: "Ads", title: "Ads", body: "Ten paid slots. Pay crypto. After approval the creative goes live for the days you bought.", readyText: "Ads · by duration" },
  { file: "join.jpg", path: "/login?mode=up", title: "Join", body: "Username + password. Pick a type at register. That type stays unless Super changes it.", readyText: "No email" },
];

function slideHtml(dataUrl, title, body) {
  return `<!doctype html><html><head><meta charset="utf-8">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{width:1280px;height:720px;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;color:#eee;display:flex;align-items:center;padding:40px 56px;gap:48px}
.phone{width:280px;height:606px;border-radius:28px;overflow:hidden;border:2px solid #252525;box-shadow:0 20px 50px #000;background:#111;flex-shrink:0}
.phone img{width:100%;height:100%;object-fit:cover;object-position:top}
.copy{max-width:720px}
.kicker{font-size:12px;letter-spacing:.18em;color:#6b9e78;font-weight:600;margin-bottom:10px}
h1{font-size:52px;line-height:1.05;margin-bottom:16px}
p{font-size:22px;line-height:1.4;color:#a0a099;max-width:560px}
</style></head><body>
<div class="phone"><img src="${dataUrl}"></div>
<div class="copy"><div class="kicker">HOW KILODE WORKS</div><h1>${title}</h1><p>${body}</p></div>
</body></html>`;
}

const browser = await chromium.launch({ args: ["--disable-web-security"] });
const phone = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
});

for (const s of SCENES) {
  const page = await phone.newPage();
  await page.goto(BASE + (s.path || "/"), { waitUntil: "networkidle", timeout: 60000 });
  if (!s.path) {
    await page.locator('[data-feed-card="1"]').first().waitFor({ state: "attached", timeout: 25000 });
  }
  if (s.tab) {
    await page.getByRole("navigation").getByRole("button", { name: s.tab, exact: true }).click({ force: true });
    await page.waitForTimeout(1500);
  }
  if (s.ready) await page.locator(s.ready).first().waitFor({ state: "attached", timeout: 20000 });
  if (s.readyText) await page.getByText(s.readyText, { exact: false }).first().waitFor({ state: "attached", timeout: 20000 });
  if (s.tab === "Chat") {
    const acc = page.getByRole("button", { name: "Accept", exact: true });
    if (await acc.count()) await acc.first().click().catch(() => undefined);
  }
  await page.waitForTimeout(800);
  const body = await page.locator("body").innerText();
  if (body.includes("Read more") && s.file === "ads.jpg") {
    console.error("ads still has Read more — abort");
    console.error(body.slice(0, 500));
    process.exit(2);
  }
  await page.screenshot({ path: `${OUT}/${s.file}`, type: "jpeg", quality: 88 });
  await page.close();
  console.log("phone", s.file, "ok");
}

const wide = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const slides = [];
for (const s of SCENES) {
  const page = await wide.newPage();
  const buf = readFileSync(`${OUT}/${s.file}`);
  const dataUrl = `data:image/jpeg;base64,${buf.toString("base64")}`;
  await page.setContent(slideHtml(dataUrl, s.title, s.body), { waitUntil: "load" });
  const slide = `${OUT}/slide-${s.file.replace(".jpg", ".png")}`;
  await page.screenshot({ path: slide, type: "png" });
  await page.close();
  slides.push(slide);
  console.log("slide", slide);
}
await browser.close();

const list = slides.map((p) => `file '${p}'\nduration 4`).join("\n") + `\nfile '${slides[slides.length - 1]}'\n`;
writeFileSync("/tmp/howto-list.txt", list);
const ff = spawnSync(
  "ffmpeg",
  ["-y", "-f", "concat", "-safe", "0", "-i", "/tmp/howto-list.txt", "-vf", "fps=24,format=yuv420p", "-movflags", "+faststart", `${OUT}/how-kilode.mp4`],
  { encoding: "utf8" },
);
if (ff.status !== 0) {
  console.error(ff.stderr);
  process.exit(ff.status || 1);
}
if (existsSync(`${OUT}/feeds.jpg`)) {
  spawnSync("cp", [`${OUT}/feeds.jpg`, `${OUT}/poster.jpg`]);
}
console.log("wrote how-kilode.mp4");
