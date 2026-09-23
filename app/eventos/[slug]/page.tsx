import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventBySlug, listEventPhotos } from "@/lib/repo";
import { formatDate, formatEUR, parseBibs } from "@/lib/format";
import { previewUrl } from "@/lib/media";
import { PackButton, PhotoGrid } from "@/components/PhotoGrid";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ dorsal?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const event = getEventBySlug(slug);
  if (!event || !event.published) return {};
  const description =
    event.description ||
    `${event.photo_count} fotografias de ${event.title}${event.location ? ` em ${event.location}` : ""}. Compre e descarregue em alta resolução.`;
  return {
    title: event.title,
    description,
    alternates: { canonical: `/eventos/${event.slug}` },
    openGraph: { title: event.title, description, images: event.cover_key ? [previewUrl(event.cover_key)] : [] },
  };
}

export default async function EventPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { dorsal } = await searchParams;
  const event = getEventBySlug(slug);
  if (!event || !event.published) notFound();

  const bib = parseBibs(dorsal)[0];
  const photos = listEventPhotos(event.id, bib);
  const hasPack = event.price_pack_cents != null && event.photo_count > 0;

  return (
    <div className="container">
      <section className="event-head">
        <div>
          <p className="meta" style={{ margin: 0 }}>
            <Link href="/">Eventos</Link> / {formatDate(event.event_date)}
            {event.location && ` · ${event.location}`}
          </p>
          <h1>{event.title}</h1>
          {event.description && <p className="muted" style={{ whiteSpace: "pre-line" }}>{event.description}</p>}
          <p className="muted">
            {event.photo_count} fotografias · {formatEUR(event.price_photo_cents)} por fotografia
          </p>
        </div>
        {hasPack && (
          <div className="card pack-box">
            <strong>Pack completo do evento</strong>
            <span className="price">{formatEUR(event.price_pack_cents!)}</span>
            <span className="hint">Todas as {event.photo_count} fotografias em alta resolução.</span>
            <PackButton eventId={event.id} priceCents={event.price_pack_cents!} />
          </div>
        )}
      </section>

      <div className="toolbar">
        <form>
          <input name="dorsal" defaultValue={bib ?? ""} placeholder="Filtrar por dorsal" inputMode="numeric" aria-label="Dorsal" />
          <button className="btn secondary" type="submit">
            Filtrar
          </button>
        </form>
        {bib && (
          <span className="muted">
            {photos.length} fotografia(s) com o dorsal <strong>{bib}</strong> ·{" "}
            <Link href={`/eventos/${event.slug}`}>ver todas</Link>
          </span>
        )}
      </div>

      {photos.length === 0 ? (
        <p className="empty">
          {bib
            ? "Não encontrámos fotografias com esse dorsal. Algumas fotos podem ainda não estar identificadas — veja todas."
            : "Ainda não há fotografias neste evento."}
        </p>
      ) : (
        <PhotoGrid
          highlightBib={bib}
          photos={photos.map((p) => ({
            id: p.id,
            key: p.file_key,
            bibs: p.bibs,
            priceCents: event.price_photo_cents,
            eventId: event.id,
          }))}
        />
      )}
    </div>
  );
}
