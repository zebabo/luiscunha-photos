import type { Metadata } from "next";
import Link from "next/link";
import { searchCars } from "@/lib/repo";
import { formatDate } from "@/lib/format";
import { thumbUrl } from "@/lib/media";
import { getT } from "@/lib/i18n-server";
import { SearchBar } from "@/components/SearchBar";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("search.title"), robots: { index: false } };
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q: raw } = await searchParams;
  const q = (raw ?? "").trim().slice(0, 60);
  const { lang, t } = await getT();
  const results = q ? searchCars(q) : [];

  return (
    <div className="container">
      <section className="hero-plain">
        <h1>{t("search.title")}</h1>
        <SearchBar t={t} defaultValue={q} autoFocus={!q} />
      </section>
      {q && results.length === 0 && <p className="empty">{t("search.none", { q })}</p>}
      {results.length > 0 && (
        <>
          <p className="muted">{t("search.results", { n: results.length, q })}</p>
          <div className="car-grid">
            {results.map((c) => (
              <Link key={c.id} href={`/eventos/${c.event_slug}/carro/${encodeURIComponent(c.number)}`} className="car-card">
                <div className="img">{c.cover_key && <img src={thumbUrl(c.cover_key)} alt="" loading="lazy" />}</div>
                <span className="num">{c.number}</span>
                <div className="info">
                  <div className="driver">{c.driver || `#${c.number}`}</div>
                  <div className="team">{c.event_title} · {formatDate(c.event_date, lang)}</div>
                  <div className="count">{t("event.photos", { n: c.photo_count })}</div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
