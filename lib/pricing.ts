import "server-only";
import { db } from "./db";
import { getDiscountByCode, type DiscountRow } from "./repo";
import { carLabel, type CartItem, type Quote, type QuoteLine } from "./cart-types";

const MAX_ITEMS = 1000;

export function parseCartItems(input: unknown): CartItem[] {
  if (!Array.isArray(input)) return [];
  const out: CartItem[] = [];
  for (const raw of input.slice(0, MAX_ITEMS)) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    if (r.type === "photo" && Number.isInteger(r.photoId)) out.push({ type: "photo", photoId: r.photoId as number });
    if (r.type === "carpack" && Number.isInteger(r.carId)) out.push({ type: "carpack", carId: r.carId as number });
    if (r.type === "pack" && Number.isInteger(r.eventId)) out.push({ type: "pack", eventId: r.eventId as number });
  }
  return out;
}

function discountProblem(d: DiscountRow | undefined): Quote["discountError"] {
  if (!d || !d.active) return "invalid";
  if (d.expires_at && new Date(d.expires_at).getTime() < Date.now()) return "expired";
  if (d.max_uses != null && d.used_count >= d.max_uses) return "used_up";
  return null;
}

/**
 * Calcula preços sempre no servidor — o carrinho do browser nunca é confiável.
 * Hierarquia: pack do evento > pack do piloto > foto avulsa. O que já está incluído num pack não é cobrado.
 */
export function buildQuote(items: CartItem[], discountCode?: string | null): Quote {
  const d = db();
  const dropped: CartItem[] = [];
  const lines: QuoteLine[] = [];

  // 1. Packs de evento
  const packEvents = new Set<number>();
  const eventStmt = d.prepare(
    `SELECT e.id, e.title, e.price_pack_cents,
       (SELECT COUNT(*) FROM photos p WHERE p.event_id = e.id) AS n,
       COALESCE((SELECT file_key FROM photos p WHERE p.id = e.cover_photo_id AND p.event_id = e.id),
                (SELECT file_key FROM photos p WHERE p.event_id = e.id ORDER BY p.original_name, p.id LIMIT 1)) AS cover
     FROM events e WHERE e.id = ? AND e.published = 1`,
  );
  for (const item of items) {
    if (item.type !== "pack" || packEvents.has(item.eventId)) continue;
    const ev = eventStmt.get(item.eventId) as
      | { id: number; title: string; price_pack_cents: number | null; n: number; cover: string | null }
      | undefined;
    if (!ev || ev.price_pack_cents == null || ev.n === 0) {
      dropped.push(item);
      continue;
    }
    packEvents.add(ev.id);
    lines.push({
      type: "pack",
      eventId: ev.id,
      eventTitle: ev.title,
      subject: ev.title,
      photoCount: ev.n,
      thumbKey: ev.cover,
      priceCents: ev.price_pack_cents,
    });
  }

  // 2. Packs de piloto
  const packCars = new Set<number>();
  const carStmt = d.prepare(
    `SELECT c.id, c.number, c.driver, e.id AS event_id, e.title, e.price_car_pack_cents,
       (SELECT COUNT(*) FROM photo_cars pc WHERE pc.car_id = c.id) AS n,
       COALESCE((SELECT p.file_key FROM photos p JOIN photo_cars pc ON pc.photo_id = p.id WHERE pc.car_id = c.id AND p.id = c.cover_photo_id),
                (SELECT p.file_key FROM photos p JOIN photo_cars pc ON pc.photo_id = p.id WHERE pc.car_id = c.id ORDER BY p.original_name, p.id LIMIT 1)) AS cover
     FROM event_cars c JOIN events e ON e.id = c.event_id WHERE c.id = ? AND e.published = 1`,
  );
  for (const item of items) {
    if (item.type !== "carpack" || packCars.has(item.carId)) continue;
    const c = carStmt.get(item.carId) as
      | { id: number; number: string; driver: string; event_id: number; title: string; price_car_pack_cents: number | null; n: number; cover: string | null }
      | undefined;
    if (!c || c.price_car_pack_cents == null || c.n === 0 || packEvents.has(c.event_id)) {
      dropped.push(item);
      continue;
    }
    packCars.add(c.id);
    lines.push({
      type: "carpack",
      carId: c.id,
      eventId: c.event_id,
      eventTitle: c.title,
      subject: carLabel(c),
      photoCount: c.n,
      thumbKey: c.cover,
      priceCents: c.price_car_pack_cents,
    });
  }

  // 3. Fotos avulsas
  const seenPhotos = new Set<number>();
  const photoStmt = d.prepare(
    `SELECT p.id, p.file_key, e.id AS event_id, e.title, e.price_photo_cents,
       (SELECT json_group_array(car_id) FROM photo_cars WHERE photo_id = p.id) AS cars
     FROM photos p JOIN events e ON e.id = p.event_id WHERE p.id = ? AND e.published = 1`,
  );
  for (const item of items) {
    if (item.type !== "photo" || seenPhotos.has(item.photoId)) continue;
    seenPhotos.add(item.photoId);
    const p = photoStmt.get(item.photoId) as
      | { id: number; file_key: string; event_id: number; title: string; price_photo_cents: number; cars: string }
      | undefined;
    const cars = p ? (JSON.parse(p.cars) as number[]) : [];
    if (!p || packEvents.has(p.event_id) || cars.some((c) => packCars.has(c))) {
      dropped.push(item);
      continue;
    }
    lines.push({
      type: "photo",
      photoId: p.id,
      eventId: p.event_id,
      eventTitle: p.title,
      subject: `#${p.id}`,
      photoCount: 1,
      thumbKey: p.file_key,
      priceCents: p.price_photo_cents,
    });
  }

  const subtotalCents = lines.reduce((s, l) => s + l.priceCents, 0);
  let discountCents = 0;
  let discount: Quote["discount"] = null;
  let discountError: Quote["discountError"] = null;

  const code = discountCode?.trim();
  if (code) {
    const row = getDiscountByCode(code);
    discountError = discountProblem(row);
    if (!discountError && row) {
      const eligible = lines
        .filter((l) => row.event_id == null || l.eventId === row.event_id)
        .reduce((s, l) => s + l.priceCents, 0);
      if (eligible === 0) {
        discountError = "not_applicable";
      } else {
        discountCents =
          row.kind === "percent"
            ? Math.round((eligible * Math.min(100, row.value)) / 100)
            : Math.min(row.value, eligible);
        discount = { code: row.code, kind: row.kind, value: row.value };
      }
    }
  }

  return {
    lines,
    subtotalCents,
    discountCents,
    totalCents: Math.max(0, subtotalCents - discountCents),
    discount,
    discountError,
    dropped,
  };
}
