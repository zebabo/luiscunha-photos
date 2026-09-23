import type { T } from "@/lib/i18n";

export function SearchBar({ t, defaultValue = "", autoFocus = false }: { t: T; defaultValue?: string; autoFocus?: boolean }) {
  return (
    <form action="/pesquisa" className="search-bar" role="search">
      <input name="q" defaultValue={defaultValue} placeholder={t("search.placeholder")} aria-label={t("search.placeholder")} autoFocus={autoFocus} />
      <button className="btn accent" type="submit">
        {t("search.button")}
      </button>
    </form>
  );
}
