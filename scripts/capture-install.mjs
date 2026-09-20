import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";

const html = (body) => `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=390">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#000;width:390px}
.phone{width:390px;height:844px;background:#0a0a0a;position:relative;overflow:hidden;color:#fff}
.bar{height:54px;display:flex;align-items:flex-end;justify-content:space-between;padding:8px 22px;font-size:15px;font-weight:600}
.shot{width:100%;height:520px;object-fit:cover;object-position:top}
.sheet{position:absolute;left:8px;right:8px;bottom:8px;background:#1c1c1e;border-radius:14px;padding:8px 0 18px;color:#fff}
.row{display:flex;align-items:center;gap:12px;padding:12px 16px;font-size:17px;border-bottom:0.5px solid #333}
.row.on{background:#2c2c2e}
.plus{width:28px;height:28px;border-radius:6px;background:#2c2c2e;display:grid;place-items:center;font-size:18px}
.and{background:#111;font-family:Roboto,sans-serif}
.menu{position:absolute;right:12px;top:86px;width:220px;background:#2c2c2e;border-radius:12px;padding:6px 0;box-shadow:0 12px 40px #000}
.mrow{padding:12px 16px;font-size:15px}
.mrow.on{background:#3d6a48}
.home{background:linear-gradient(#1a2a1c,#0a0a0a);display:grid;grid-template-columns:repeat(4,1fr);gap:18px;padding:90px 22px}
.ico{text-align:center;font-size:11px;color:#ddd}
.ico img,.ico .k{width:60px;height:60px;border-radius:14px;margin:0 auto 6px;background:#111;display:grid;place-items:center}
.k{background:#0d1a10;border:1px solid #3d6a48;color:#6b9e78;font-size:28px;font-weight:800}
</style></head><body>${body}</body></html>`;

mkdirSync("/workspace/public/install", { recursive: true });

const pages = {
  "ios-share.png": html(`<div class="phone">
    <div class="bar"><span>1:12</span><span>LTE 99</span></div>
    <img class="shot" src="file:///workspace/attachments/IMG_4374.jpg"/>
    <div class="sheet">
      <div class="row"><span>Share</span></div>
      <div class="row on"><div class="plus">＋</div> Add to Home Screen</div>
      <div class="row"><div class="plus">☆</div> Add Bookmark</div>
      <div class="row"><div class="plus">☐</div> Copy</div>
    </div>
  </div>`),
  "android-menu.png": html(`<div class="phone and">
    <div class="bar"><span>1:12</span><span>LTE 99</span></div>
    <img class="shot" src="file:///workspace/attachments/IMG_4374.jpg"/>
    <div class="menu">
      <div class="mrow">Open in Chrome</div>
      <div class="mrow on">Add to Home screen</div>
      <div class="mrow">Download</div>
      <div class="mrow">Star</div>
    </div>
  </div>`),
  "homescreen.png": html(`<div class="phone"><div class="home">
    ${["Phone","Safari","Maps","Photos"].map((n)=>`<div class="ico"><div class="k" style="background:#222;color:#888;border:0;font-size:12px">${n[0]}</div>${n}</div>`).join("")}
    <div class="ico"><div class="k">!</div>Kilode</div>
    ${["Music","Camera","Mail","Notes"].map((n)=>`<div class="ico"><div class="k" style="background:#222;color:#888;border:0;font-size:12px">${n[0]}</div>${n}</div>`).join("")}
  </div></div>`),
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
for (const [name, doc] of Object.entries(pages)) {
  const page = await ctx.newPage();
  await page.setContent(doc, { waitUntil: "load" });
  await page.screenshot({ path: `/workspace/public/install/${name}`, type: "png" });
  await page.close();
  console.log("wrote", name);
}
await browser.close();
