import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCarByNumber, getEventBySlug, listCarPhotos, searchCars } from "@/lib/repo";
import { formatDate, formatEUR } from "@/lib/format";
import { previewUrl, thumbUrl } from "@/lib/media";
import { getT } from "@/lib/i18n-server";
import { carLabel } from "@/lib/cart-types";
import { PackButton, PhotoGrid } from "@/components/PhotoGrid";

type Props = { params: Promise<{ slug: string; number: string }> };

async function load(params: Props["params"]) {
  const { slug, number } = await params;
  const event = getEventBySlug(slug);
  if (!event || !event.published) return null;
  const car = getCarByNumber(event.id, decodeURIComponent(number));
  if (!car) return null;
  return { event, car };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await load(params);
  if (!data) return {};
  const { event, car } = data;
  const title = `${carLabel(car)} — ${event.title}`;
  return {
    title,
    description: `${title}${car.team ? ` (${car.team})` : ""}`,
    openGraph: { title, images: car.cover_key ? [previewUrl(car.cover_key)] : [] },
  };
}

export default async function CarPage({ params }: Props) {
  const data = await load(params);
  if (!data) notFound();
  const { event, car } = data;
  const { lang, t } = await getT();
  const photos = listCarPhotos(car.id);
  const hasPack = event.price_car_pack_cents != null && photos.length > 0;
  const saving = hasPack ? photos.length * event.price_photo_cents - event.price_car_pack_cents! : 0;
  // O mesmo piloto noutros eventos (pelo nome).
  const other = car.driver
    ? searchCars(car.driver).filter((c) => c.id !== car.id && c.driver.toLowerCase() === car.driver.toLowerCase())
    : [];

  return (
    <div className="container">
      <section className="event-head">
        <div>
          <p className="eyebrow" style={{ margin: 0 }}>
            <Link href={`/eventos/${event.slug}`}>← {event.title}</Link> · {formatDate(event.event_date, lang)}
          </p>
          <div className="car-head" style={{ marginTop: 12 }}>
            <span className="big-num">{car.number}</span>
            <div>
              <h1 style={{ margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>{car.driver || `#${car.number}`}</h1>
              {car.team && <div className="muted">{car.team}</div>}
            </div>
          </div>
          <p className="muted">
            {t("car.photos", { n: photos.length })} · {t("event.pricePhoto", { price: formatEUR(event.price_photo_cents, lang) })}
          </p>
        </div>
        {hasPack && (
          <div className="card pack-box">
            <strong>{t("car.packTitle")}</strong>
            <span className="price">{formatEUR(event.price_car_pack_cents!, lang)}</span>
            <span className="hint">{t("car.packDesc", { n: photos.length, car: carLabel(car) })}</span>
            {saving > 0 && <span className="success">{t("car.packSave", { amount: formatEUR(saving, lang) })}</span>}
            <PackButton item={{ type: "carpack", carId: car.id }} eventId={event.id} priceCents={event.price_car_pack_cents!} />
          </div>
        )}
      </section>

      {photos.length === 0 ? (
        <p className="empty">{t("car.noPhotos")}</p>
      ) : (
        <PhotoGrid
          photos={photos.map((p) => ({
            id: p.id,
            key: p.file_key,
            priceCents: event.price_photo_cents,
            eventId: event.id,
            carIds: p.car_ids,
            caption: carLabel(car),
          }))}
        />
      )}

      {other.length > 0 && (
        <section>
          <h2>{t("car.otherEvents")}</h2>
          <div className="car-grid">
            {other.map((c) => (
              <Link key={c.id} href={`/eventos/${c.event_slug}/carro/${encodeURIComponent(c.number)}`} className="car-card">
                <div className="img">{c.cover_key && <img src={thumbUrl(c.cover_key)} alt="" loading="lazy" />}</div>
                <span className="num">{c.number}</span>
                <div className="info">
                  <div className="driver">{c.event_title}</div>
                  <div className="count">{formatDate(c.event_date, lang)}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
