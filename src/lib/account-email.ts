/** Private login ids derived from public username. Users never type an email. */
const DOMAINS = ["users.kilode.ng", "users.naijaforum.app"] as const;

function handleOf(username: string) {
  return username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "")
    .slice(0, 24) || "user";
}

export function accountEmail(username: string, domain: (typeof DOMAINS)[number] = DOMAINS[0]) {
  return `${handleOf(username)}@${domain}`;
}

export function accountEmails(username: string) {
  const u = handleOf(username);
  return DOMAINS.map((d) => `${u}@${d}`);
}

export function publicUsername(raw: string) {
  return raw.trim().split("@")[0].replace(/\s+/g, "").slice(0, 24);
}
