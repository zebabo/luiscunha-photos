import Link from "next/link";
import { config } from "@/lib/config";
import { listPortfolio, listPublishedEvents, listUpcoming } from "@/lib/repo";
import { getSettings } from "@/lib/settings";
import { getT } from "@/lib/i18n-server";
import { previewUrl, siteImageUrl } from "@/lib/media";
import { EventCard } from "@/components/EventCard";
import { SearchBar } from "@/components/SearchBar";

export default async function HomePage() {
  const { lang, t } = await getT();
  const s = getSettings();
  const events = listPublishedEvents();
  const upcoming = listUpcoming();
  const portfolio = listPortfolio(6);
  // Capa: a escolhida no admin; senão uma foto do portefólio (sem marca de água); em último caso, a do último evento.
  const heroSrc = s.hero_key
    ? siteImageUrl(s.hero_key)
    : portfolio[0]
      ? siteImageUrl(portfolio[0].image_key)
      : events[0]?.cover_key
        ? previewUrl(events[0].cover_key)
        : "";
  const tagline = lang === "en" ? s.tagline_en : s.tagline_pt;

  const intro = (
    <>
      <p className="eyebrow">{tagline}</p>
      <h1>{t("home.find")}</h1>
      <p>{t("home.findHint")}</p>
      <SearchBar t={t} />
    </>
  );

  return (
    <>
      {heroSrc ? (
        <section className="hero-img">
          <img src={heroSrc} alt="" />
          <div className="overlay">
            <div className="container">{intro}</div>
          </div>
        </section>
      ) : (
        <section className="container hero-plain">{intro}</section>
      )}

      <div className="container">
        <h2 className="section-title" id="eventos">
          {t("home.recent")}
        </h2>
        <p className="section-sub">{t("home.recentHint")}</p>
        {events.length === 0 ? (
          <p className="empty">—</p>
        ) : (
          <div className="event-grid">
            {events.slice(0, 6).map((e) => (
              <EventCard key={e.id} e={e} lang={lang} t={t} />
            ))}
          </div>
        )}
        {events.length > 6 && (
          <p style={{ textAlign: "center", marginTop: 28 }}>
            <Link className="btn secondary" href="/eventos">
              {t("home.allEvents")}
            </Link>
          </p>
        )}

        {upcoming.length > 0 && (
          <>
            <h2 className="section-title">{t("home.upcoming")}</h2>
            <div className="upcoming-grid" style={{ marginTop: 32 }}>
              {upcoming.map((u) => {
                const inner = (
                  <>
                    <div className="poster">{u.image_key && <img src={siteImageUrl(u.image_key)} alt={u.title} loading="lazy" />}</div>
                    <div className="when">{u.date_label}</div>
                    <div className="what">
                      {u.title}
                      {u.details && `\n${u.details}`}
                    </div>
                  </>
                );
                return u.link_url ? (
                  <a key={u.id} className="upcoming" href={u.link_url} target="_blank" rel="noopener noreferrer">
                    {inner}
                  </a>
                ) : (
                  <div key={u.id} className="upcoming">
                    {inner}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {portfolio.length > 0 && (
          <>
            <h2 className="section-title">{t("home.portfolio")}</h2>
            <div className="masonry" style={{ marginTop: 32 }}>
              {portfolio.map((p) => (
                <figure key={p.id}>
                  <img src={siteImageUrl(p.image_key)} alt={p.caption || config.siteName} loading="lazy" width={p.width} height={p.height} style={{ height: "auto" }} />
                  {p.caption && <figcaption>{p.caption}</figcaption>}
                </figure>
              ))}
            </div>
            <p style={{ textAlign: "center", marginTop: 20 }}>
              <Link className="btn secondary" href="/portefolio">
                {t("home.seeAll")}
              </Link>
            </p>
          </>
        )}
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: config.siteName,
            url: config.siteUrl,
            potentialAction: {
              "@type": "SearchAction",
              target: `${config.siteUrl}/pesquisa?q={q}`,
              "query-input": "required name=q",
            },
          }).replace(/</g, "\\u003c"),
        }}
      />
    </>
  );
}
