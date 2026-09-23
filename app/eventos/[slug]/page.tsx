import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventBySlug, listEventCars, listEventPhotos } from "@/lib/repo";
import { formatDate, formatEUR } from "@/lib/format";
import { previewUrl } from "@/lib/media";
import { getT } from "@/lib/i18n-server";
import { carLabel } from "@/lib/cart-types";
import { PackButton, PhotoGrid } from "@/components/PhotoGrid";
import { CarGrid } from "@/components/CarGrid";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const event = getEventBySlug(slug);
  if (!event || !event.published) return {};
  const { t } = await getT();
  const description =
    event.description ||
    `${event.title}${event.location ? ` · ${event.location}` : ""} — ${t("event.photos", { n: event.photo_count })}.`;
  return {
    title: event.title,
    description,
    alternates: { canonical: `/eventos/${event.slug}` },
    openGraph: { title: event.title, description, images: event.cover_key ? [previewUrl(event.cover_key)] : [] },
  };
}

export default async function EventPage({ params }: Props) {
  const { slug } = await params;
  const event = getEventBySlug(slug);
  if (!event || !event.published) notFound();
  const { lang, t } = await getT();

  const cars = listEventCars(event.id).filter((c) => c.photo_count > 0);
  const photos = listEventPhotos(event.id);
  const carById = new Map(cars.map((c) => [c.id, c]));
  const hasPack = event.price_pack_cents != null && event.photo_count > 0;

  return (
    <div className="container">
      <section className="event-head">
        <div>
          <p className="eyebrow" style={{ margin: 0 }}>
            <Link href="/eventos">{t("nav.events")}</Link> · {formatDate(event.event_date, lang)}
            {event.location && ` · ${event.location}`}
          </p>
          <h1 style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>{event.title}</h1>
          {event.description && <p className="muted" style={{ whiteSpace: "pre-line" }}>{event.description}</p>}
          <p className="muted">
            {[
              t("event.photos", { n: event.photo_count }),
              cars.length ? t("event.cars", { n: cars.length }) : "",
              t("event.pricePhoto", { price: formatEUR(event.price_photo_cents, lang) }),
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        {hasPack && (
          <div className="card pack-box">
            <strong>{t("event.packTitle")}</strong>
            <span className="price">{formatEUR(event.price_pack_cents!, lang)}</span>
            <span className="hint">{t("event.packDesc", { n: event.photo_count })}</span>
            <PackButton item={{ type: "pack", eventId: event.id }} eventId={event.id} priceCents={event.price_pack_cents!} />
          </div>
        )}
      </section>

      {cars.length > 0 && (
        <section>
          <h2>{t("event.chooseCar")}</h2>
          <p className="muted" style={{ marginTop: -8 }}>{t("event.chooseCarHint")}</p>
          <CarGrid
            baseHref={`/eventos/${event.slug}`}
            cars={cars.map((c) => ({
              id: c.id,
              number: c.number,
              driver: c.driver,
              team: c.team,
              photoCount: c.photo_count,
              coverKey: c.cover_key,
            }))}
          />
        </section>
      )}

      <h2>{t("event.allPhotos")}</h2>
      {photos.length === 0 ? (
        <p className="empty">{t("event.noPhotos")}</p>
      ) : (
        <PhotoGrid
          photos={photos.map((p) => ({
            id: p.id,
            key: p.file_key,
            priceCents: event.price_photo_cents,
            eventId: event.id,
            carIds: p.car_ids,
            caption: p.car_ids
              .map((id) => carById.get(id))
              .filter((c) => !!c)
              .map((c) => carLabel(c!))
              .join(" · "),
          }))}
        />
      )}
    </div>
  );
}
