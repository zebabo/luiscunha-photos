import type { Metadata } from "next";
import Link from "next/link";
import { searchPublishedByBib } from "@/lib/repo";
import { parseBibs } from "@/lib/format";
import { PhotoGrid, type GridPhoto } from "@/components/PhotoGrid";

export const metadata: Metadata = { title: "Procurar por dorsal" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ dorsal?: string }> }) {
  const { dorsal } = await searchParams;
  const bib = parseBibs(dorsal)[0];
  const results = bib ? searchPublishedByBib(bib) : [];

  // Agrupa por evento
  const groups = new Map<number, { slug: string; title: string; photos: GridPhoto[] }>();
  for (const r of results) {
    let g = groups.get(r.event_id);
    if (!g) {
      g = { slug: r.event_slug, title: r.event_title, photos: [] };
      groups.set(r.event_id, g);
    }
    g.photos.push({
      id: r.id,
      key: r.file_key,
      bibs: r.bibs,
      priceCents: r.price_photo_cents,
      eventId: r.event_id,
      eventTitle: r.event_title,
    });
  }

  return (
    <div className="container">
      <section className="hero" style={{ paddingBottom: 8 }}>
        <h1>Procurar por dorsal</h1>
        <form className="search-bar" role="search">
          <input name="dorsal" defaultValue={bib ?? ""} placeholder="N.º de dorsal" inputMode="numeric" autoFocus aria-label="Número de dorsal" />
          <button className="btn" type="submit">
            Procurar
          </button>
        </form>
      </section>

      {bib && results.length === 0 && (
        <p className="empty">
          Não encontrámos fotografias com o dorsal <strong>{bib}</strong>. Algumas fotos podem não estar identificadas —
          experimente <Link href="/#eventos">ver o evento completo</Link>.
        </p>
      )}

      {[...groups.values()].map((g) => (
        <section key={g.slug}>
          <h2>
            <Link href={`/eventos/${g.slug}?dorsal=${encodeURIComponent(bib!)}`}>{g.title}</Link>{" "}
            <span className="muted" style={{ fontSize: "1rem" }}>
              · {g.photos.length} foto(s)
            </span>
          </h2>
          <PhotoGrid photos={g.photos} highlightBib={bib} />
        </section>
      ))}
    </div>
  );
}
