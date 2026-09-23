"use client";

import { createContext, useContext, useMemo } from "react";
import { LANG_COOKIE, makeT, type Lang, type T } from "@/lib/i18n";

const Ctx = createContext<{ lang: Lang; t: T } | null>(null);

export function I18nProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  const value = useMemo(() => ({ lang, t: makeT(lang) }), [lang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useI18n fora do I18nProvider");
  return v;
}

export function LangSwitch() {
  const { lang } = useI18n();
  const set = (l: Lang) => {
    document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    window.location.reload();
  };
  return (
    <span className="lang-switch" role="group" aria-label="Idioma / Language">
      <button type="button" className={lang === "pt" ? "on" : ""} onClick={() => set("pt")} aria-pressed={lang === "pt"}>
        PT
      </button>
      <button type="button" className={lang === "en" ? "on" : ""} onClick={() => set("en")} aria-pressed={lang === "en"}>
        EN
      </button>
    </span>
  );
}
