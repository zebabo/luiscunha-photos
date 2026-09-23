import "server-only";
import { db } from "./db";
import { config } from "./config";

export const SETTING_KEYS = [
  "tagline_pt",
  "tagline_en",
  "about_pt",
  "about_en",
  "contact_email",
  "phone",
  "instagram",
  "facebook",
  "logo_key",
  "hero_key",
  "about_image_key",
] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];
export type Settings = Record<SettingKey, string>;

const DEFAULTS: Settings = {
  tagline_pt: "Fotografia de drift e desporto motorizado",
  tagline_en: "Drift and motorsport photography",
  about_pt: "",
  about_en: "",
  contact_email: "",
  phone: "",
  instagram: "",
  facebook: "",
  logo_key: "",
  hero_key: "",
  about_image_key: "",
};

export function getSettings(): Settings {
  const rows = db().prepare(`SELECT key, value FROM settings`).all() as { key: string; value: string }[];
  const s = { ...DEFAULTS, contact_email: config.contactEmail };
  for (const r of rows) if ((SETTING_KEYS as readonly string[]).includes(r.key)) s[r.key as SettingKey] = r.value;
  return s;
}

export function setSetting(key: SettingKey, value: string) {
  db()
    .prepare(`INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`)
    .run(key, value);
}

export function instagramUrl(handle: string): string {
  if (!handle) return "";
  if (/^https?:\/\//.test(handle)) return handle;
  return `https://www.instagram.com/${handle.replace(/^@/, "")}/`;
}
