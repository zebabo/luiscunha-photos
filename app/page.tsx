import Link from "next/link";
import { config } from "@/lib/config";
import { listPublishedEvents } from "@/lib/repo";
import { formatDate, formatEUR } from "@/lib/format";
import { thumbUrl } from "@/lib/media";

export default function HomePage() {
  const events = listPublishedEvents();
  return (
    <div className="container">
      <section className="hero">
        <h1>Encontre as suas fotografias</h1>
        <p>
          Escolha o evento ou pesquise pelo seu número de dorsal. Depois do pagamento recebe as fotografias em alta
          resolução, sem marca de água, prontas a descarregar.
        </p>
        <form action="/pesquisa" className="search-bar" role="search">
          <input name="dorsal" placeholder="N.º de dorsal (ex.: 1234)" inputMode="numeric" aria-label="Número de dorsal" />
          <button className="btn" type="submit">
            Procurar
          </button>
        </form>
      </section>

      <h2 id="eventos">Eventos</h2>
      {events.length === 0 ? (
        <p className="empty">Ainda não há eventos publicados.</p>
      ) : (
        <div className="event-grid">
          {events.map((e) => (
            <Link key={e.id} href={`/eventos/${e.slug}`} className="event-card">
              <div className="cover">
                {e.cover_key && <img src={thumbUrl(e.cover_key)} alt={e.title} loading="lazy" />}
              </div>
              <h3>{e.title}</h3>
              <div className="meta">
                {[formatDate(e.event_date), e.location].filter(Boolean).join(" · ")}
              </div>
              <div className="meta">
                {e.photo_count} fotografias · desde {formatEUR(e.price_photo_cents)}
              </div>
            </Link>
          ))}
        </div>
      )}
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
              target: `${config.siteUrl}/pesquisa?dorsal={dorsal}`,
              "query-input": "required name=dorsal",
            },
          }).replace(/</g, "\\u003c"),
        }}
      />
    </div>
  );
}
