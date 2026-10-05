/** Shared job and ad rules. The screens and the tests both call these. */

export function parseSalary(raw?: string): number {
  const text = String(raw || "").toLowerCase().replace(/,/g, "");
  const hit = text.match(/(\d+(?:\.\d+)?)(\s*[km])?/i);
  if (!hit) return 0;
  let n = Number(hit[1]);
  if (!Number.isFinite(n) || n <= 0) return 0;
  const unit = (hit[2] || "").trim();
  if (unit === "k") n *= 1000;
  else if (unit === "m") n *= 1_000_000;
  return Math.round(n);
}

export function payLine(raw?: string): string {
  const text = String(raw || "").trim();
  if (!text || /^salary on request$/i.test(text) || /^ask$/i.test(text)) return "Salary on request";
  if (/[–—-]/.test(text) && /\d/.test(text)) return text.includes("₦") ? text : `₦${text.replace(/^N\s?/i, "")}`;
  const n = parseSalary(text);
  if (!n) return text;
  return `₦${n.toLocaleString("en-NG")}`;
}

export function salaryBand(raw: string | undefined, band: string, includeOpen = true): boolean {
  if (band === "Any") return true;
  const n = parseSalary(raw);
  if (!n) return includeOpen;
  if (band === "Under ₦500k") return n < 500000;
  if (band === "₦500k – ₦1M") return n >= 500000 && n <= 1000000;
  return n > 1000000;
}

export function laneMatch(blob: string, pill: string): boolean {
  const text = blob.toLowerCase();
  if (pill === "All" || !pill) return true;
  if (pill === "Tech") return /\b(tech|engineer|developer|software)\b/.test(text);
  if (pill === "Creative") return /\b(design|creative|writer|media|artist|art)\b/.test(text);
  if (pill === "Sales") return /\b(sale|sales|marketing)\b/.test(text);
  if (pill === "Remote") return /\bremote\b/.test(text);
  return true;
}

export function experienceMatch(level: string | undefined, pick: string): boolean {
  if (!pick || pick === "All") return true;
  return (level || "") === pick;
}

export function searchRank(row: { title: string; company?: string; city?: string; body?: string }, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const title = row.title.toLowerCase();
  if (title.startsWith(q)) return 4;
  if (title.includes(q)) return 3;
  if ((row.company || "").toLowerCase().includes(q)) return 2;
  const rest = `${row.city || ""} ${row.body || ""}`.toLowerCase();
  if (rest.includes(q)) return 1;
  return 0;
}

export function applyProblems(input: { note?: string; phone?: string; cv?: string; skills?: string; legal?: boolean }): string {
  if (input.legal === false) return "Tick the notice before you apply.";
  const note = (input.note ?? "").trim();
  if (note.length < 2) return "Write a short note.";
  if (note.length > 500) return "The note is over 500 characters.";
  const digits = (input.phone ?? "").replace(/\D/g, "");
  if (digits.length < 7) return "Add a phone number the employer can use.";
  if (digits.length > 15) return "That phone number is too long.";
  const cv = (input.cv ?? "").trim();
  if (cv && !/^https:\/\//i.test(cv)) return "CV link must start with https://";
  if ((input.skills ?? "").trim().length > 160) return "Skills are over 160 characters.";
  return "";
}

export function cvFileProblem(file: { name: string; type: string; size: number }): string {
  if (file.size > 4 * 1024 * 1024) return "CV must be 4MB or smaller.";
  const pdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  if (!pdf) return "Use a PDF. Or paste an https link.";
  return "";
}

export function creativeFits(width: number, height: number, label: string): boolean {
  const want = label.match(/(\d+)\s*[×x]\s*(\d+)/i);
  if (!want || !width || !height) return true;
  const dw = Math.abs(width - Number(want[1])) / Number(want[1]);
  const dh = Math.abs(height - Number(want[2])) / Number(want[2]);
  return dw <= 0.25 && dh <= 0.25;
}

/** Slot price is the catalog price. Days do not multiply it. */
export function slotCharge(usd: number, _days: number): number {
  return Math.max(0, Math.round(Number(usd) || 0));
}

export function runEnd(from: number, days: number): number {
  const span = [1, 7, 14, 30].includes(days) ? days : 7;
  return from + span * 86_400_000;
}

export function shareText(row: { title: string; company?: string; city?: string }, url: string): string {
  const line = [row.title, row.company, row.city].filter(Boolean).join(" · ");
  return `${line}\n${url}`;
}

export function deadlinePast(raw: string, now = Date.now()): boolean {
  const t = raw.trim();
  if (!t) return false;
  const ms = Date.parse(t);
  if (!Number.isFinite(ms)) return false;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return ms < start.getTime();
}

export function mentionQuery(body: string): string {
  const hit = body.match(/(^|\s)@([a-z0-9._-]{0,24})$/i);
  if (!hit || hit[2].length < 2) return "";
  return hit[2];
}
