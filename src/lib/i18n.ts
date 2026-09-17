export const LANGS = [
  { id: "en", label: "English" },
  { id: "yo", label: "Yoruba" },
  { id: "ig", label: "Igbo" },
  { id: "ha", label: "Hausa" },
  { id: "fr", label: "French" },
  { id: "es", label: "Spanish" },
] as const;

export type LangId = (typeof LANGS)[number]["id"];
