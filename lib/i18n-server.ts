import "server-only";
import { cookies, headers } from "next/headers";
import { isLang, LANG_COOKIE, makeT, type Lang } from "./i18n";

/** Idioma escolhido (cookie) ou, na primeira visita, o do browser. Português por omissão. */
export async function getLang(): Promise<Lang> {
  const c = (await cookies()).get(LANG_COOKIE)?.value;
  if (isLang(c)) return c;
  const accept = (await headers()).get("accept-language") ?? "";
  const first = accept.split(",")[0]?.trim().slice(0, 2).toLowerCase();
  return first && first !== "pt" && accept ? "en" : "pt";
}

export async function getT() {
  const lang = await getLang();
  return { lang, t: makeT(lang) };
}
