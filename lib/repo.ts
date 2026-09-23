import "server-only";
import { db } from "./db";

export type EventRow = {
  id: number;
  slug: string;
  title: string;
  description: string;
  event_date: string | null;
  location: string;
  price_photo_cents: number;
  price_car_pack_cents: number | null;
  price_pack_cents: number | null;
  cover_photo_id: number | null;
  published: number;
  created_at: string;
};

export type EventWithStats = EventRow & { photo_count: number; car_count: number; cover_key: string | null };

export type CarRow = {
  id: number;
  event_id: number;
  number: string;
  driver: string;
  team: string;
  cover_photo_id: number | null;
  created_at: string;
};

export type CarWithStats = CarRow & { photo_count: number; cover_key: string | null };

export type PhotoRow = {
  id: number;
  event_id: number;
  file_key: string;
  original_ext: string;
  original_name: string;
  width: number;
  height: number;
  created_at: string;
};

export type PhotoWithCars = PhotoRow & { car_ids: number[] };

export type DiscountRow = {
  id: number;
  code: string;
  kind: "percent" | "fixed";
  value: number;
  event_id: number | null;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  active: number;
  created_at: string;
};

export type OrderRow = {
  id: number;
  public_id: string;
  email: string;
  name: string;
  nif: string;
  lang: string;
  status: "pending" | "paid" | "failed" | "expired";
  subtotal_cents: number;
  discount_cents: number;
  total_cents: number;
  discount_code: string | null;
  provider: string;
  provider_ref: string | null;
  download_token: string | null;
  download_expires_at: string | null;
  created_at: string;
  paid_at: string | null;
};

export type OrderItemRow = {
  id: number;
  order_id: number;
  kind: "photo" | "carpack" | "pack";
  photo_id: number | null;
  car_id: number | null;
  event_id: number | null;
  label: string;
  price_cents: number;
};

const EVENT_STATS_SQL = `
  SELECT e.*,
    (SELECT COUNT(*) FROM photos p WHERE p.event_id = e.id) AS photo_count,
    (SELECT COUNT(*) FROM event_cars c WHERE c.event_id = e.id) AS car_count,
    COALESCE(
      (SELECT file_key FROM photos p WHERE p.id = e.cover_photo_id AND p.event_id = e.id),
      (SELECT file_key FROM photos p WHERE p.event_id = e.id ORDER BY p.original_name, p.id LIMIT 1)
    ) AS cover_key
  FROM events e`;

// ── Eventos ──────────────────────────────────────────────

export function listPublishedEvents(): EventWithStats[] {
  return db()
    .prepare(`${EVENT_STATS_SQL} WHERE e.published = 1 ORDER BY e.event_date DESC, e.id DESC`)
    .all() as EventWithStats[];
}

export function listAllEvents(): EventWithStats[] {
  return db()
    .prepare(`${EVENT_STATS_SQL} ORDER BY e.event_date DESC, e.id DESC`)
    .all() as EventWithStats[];
}

export function getEventBySlug(slug: string): EventWithStats | undefined {
  return db().prepare(`${EVENT_STATS_SQL} WHERE e.slug = ?`).get(slug) as EventWithStats | undefined;
}

export function getEvent(id: number): EventWithStats | undefined {
  return db().prepare(`${EVENT_STATS_SQL} WHERE e.id = ?`).get(id) as EventWithStats | undefined;
}

// ── Carros / pilotos ─────────────────────────────────────

const CAR_STATS_SQL = `
  SELECT c.*,
    (SELECT COUNT(*) FROM photo_cars pc WHERE pc.car_id = c.id) AS photo_count,
    COALESCE(
      (SELECT p.file_key FROM photos p JOIN photo_cars pc ON pc.photo_id = p.id
        WHERE pc.car_id = c.id AND p.id = c.cover_photo_id),
      (SELECT p.file_key FROM photos p JOIN photo_cars pc ON pc.photo_id = p.id
        WHERE pc.car_id = c.id ORDER BY p.original_name, p.id LIMIT 1)
    ) AS cover_key
  FROM event_cars c`;

/** Ordena números de carro de forma natural (2, 10, 28, 111, A1…). */
function byNumber(a: CarRow, b: CarRow) {
  return a.number.localeCompare(b.number, "pt", { numeric: true });
}

export function listEventCars(eventId: number): CarWithStats[] {
  const rows = db().prepare(`${CAR_STATS_SQL} WHERE c.event_id = ?`).all(eventId) as CarWithStats[];
  return rows.sort(byNumber);
}

export function getCar(id: number): CarWithStats | undefined {
  return db().prepare(`${CAR_STATS_SQL} WHERE c.id = ?`).get(id) as CarWithStats | undefined;
}

export function getCarByNumber(eventId: number, number: string): CarWithStats | undefined {
  return db().prepare(`${CAR_STATS_SQL} WHERE c.event_id = ? AND c.number = ?`).get(eventId, number) as
    | CarWithStats
    | undefined;
}

export type CarSearchResult = CarWithStats & { event_slug: string; event_title: string; event_date: string | null };

/** Pesquisa por número (exato), piloto ou equipa em todos os eventos publicados. */
export function searchCars(query: string): CarSearchResult[] {
  const q = query.trim().replace(/^#/, "");
  if (!q) return [];
  const like = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
  return db()
    .prepare(
      `SELECT x.*, e.slug AS event_slug, e.title AS event_title, e.event_date FROM (${CAR_STATS_SQL}) x
       JOIN events e ON e.id = x.event_id
       WHERE e.published = 1 AND x.photo_count > 0
         AND (x.number = ? COLLATE NOCASE OR x.driver LIKE ? ESCAPE '\\' OR x.team LIKE ? ESCAPE '\\')
       ORDER BY e.event_date DESC, e.id DESC
       LIMIT 100`,
    )
    .all(q, like, like) as CarSearchResult[];
}

// ── Fotografias ──────────────────────────────────────────

function attachCars(photos: PhotoRow[]): PhotoWithCars[] {
  if (photos.length === 0) return [];
  const rows = db()
    .prepare(`SELECT photo_id, car_id FROM photo_cars WHERE photo_id IN (SELECT value FROM json_each(?))`)
    .all(JSON.stringify(photos.map((p) => p.id))) as { photo_id: number; car_id: number }[];
  const map = new Map<number, number[]>();
  for (const r of rows) map.set(r.photo_id, [...(map.get(r.photo_id) ?? []), r.car_id]);
  return photos.map((p) => ({ ...p, car_ids: map.get(p.id) ?? [] }));
}

export function listEventPhotos(eventId: number): PhotoWithCars[] {
  const rows = db()
    .prepare(`SELECT * FROM photos WHERE event_id = ? ORDER BY original_name, id`)
    .all(eventId) as PhotoRow[];
  return attachCars(rows);
}

export function listCarPhotos(carId: number): PhotoWithCars[] {
  const rows = db()
    .prepare(
      `SELECT p.* FROM photos p JOIN photo_cars pc ON pc.photo_id = p.id WHERE pc.car_id = ? ORDER BY p.original_name, p.id`,
    )
    .all(carId) as PhotoRow[];
  return attachCars(rows);
}

export function getPhoto(id: number): PhotoRow | undefined {
  return db().prepare(`SELECT * FROM photos WHERE id = ?`).get(id) as PhotoRow | undefined;
}

// ── Descontos ────────────────────────────────────────────

export function getDiscountByCode(code: string): DiscountRow | undefined {
  return db().prepare(`SELECT * FROM discount_codes WHERE code = ?`).get(code.trim()) as
    | DiscountRow
    | undefined;
}

export function listDiscounts(): (DiscountRow & { event_title: string | null })[] {
  return db()
    .prepare(
      `SELECT d.*, e.title AS event_title FROM discount_codes d
       LEFT JOIN events e ON e.id = d.event_id ORDER BY d.created_at DESC, d.id DESC`,
    )
    .all() as (DiscountRow & { event_title: string | null })[];
}

// ── Encomendas ───────────────────────────────────────────

export function getOrder(id: number): OrderRow | undefined {
  return db().prepare(`SELECT * FROM orders WHERE id = ?`).get(id) as OrderRow | undefined;
}

export function getOrderByPublicId(publicId: string): OrderRow | undefined {
  return db().prepare(`SELECT * FROM orders WHERE public_id = ?`).get(publicId) as
    | OrderRow
    | undefined;
}

export function getOrderByToken(token: string): OrderRow | undefined {
  return db().prepare(`SELECT * FROM orders WHERE download_token = ?`).get(token) as
    | OrderRow
    | undefined;
}

export function getOrderItems(orderId: number): OrderItemRow[] {
  return db()
    .prepare(`SELECT * FROM order_items WHERE order_id = ? ORDER BY id`)
    .all(orderId) as OrderItemRow[];
}

/** Todas as fotografias a que uma encomenda dá direito (fotos avulsas + packs de piloto + packs de evento). */
export function getOrderPhotos(orderId: number): (PhotoRow & { event_title: string })[] {
  return db()
    .prepare(
      `SELECT DISTINCT p.*, e.title AS event_title FROM photos p
       JOIN events e ON e.id = p.event_id
       WHERE p.id IN (SELECT photo_id FROM order_items WHERE order_id = ? AND kind = 'photo')
          OR p.event_id IN (SELECT event_id FROM order_items WHERE order_id = ? AND kind = 'pack')
          OR p.id IN (SELECT pc.photo_id FROM photo_cars pc
                      WHERE pc.car_id IN (SELECT car_id FROM order_items WHERE order_id = ? AND kind = 'carpack'))
       ORDER BY e.title, p.original_name, p.id`,
    )
    .all(orderId, orderId, orderId) as (PhotoRow & { event_title: string })[];
}

export function listOrders(limit = 200): (OrderRow & { item_count: number })[] {
  return db()
    .prepare(
      `SELECT o.*, (SELECT COUNT(*) FROM order_items i WHERE i.order_id = o.id) AS item_count
       FROM orders o ORDER BY o.id DESC LIMIT ?`,
    )
    .all(limit) as (OrderRow & { item_count: number })[];
}

export function salesStats() {
  const d = db();
  const total = d
    .prepare(`SELECT COUNT(*) AS n, COALESCE(SUM(total_cents),0) AS cents FROM orders WHERE status='paid'`)
    .get() as { n: number; cents: number };
  const last30 = d
    .prepare(
      `SELECT COUNT(*) AS n, COALESCE(SUM(total_cents),0) AS cents FROM orders
       WHERE status='paid' AND paid_at >= datetime('now','-30 days')`,
    )
    .get() as { n: number; cents: number };
  const byEvent = d
    .prepare(
      `SELECT e.title, COUNT(DISTINCT o.id) AS orders, COALESCE(SUM(i.price_cents),0) AS cents
       FROM order_items i JOIN orders o ON o.id = i.order_id AND o.status='paid'
       JOIN events e ON e.id = i.event_id
       GROUP BY e.id ORDER BY cents DESC LIMIT 10`,
    )
    .all() as { title: string; orders: number; cents: number }[];
  return { total, last30, byEvent };
}

// ── Conteúdo do site ─────────────────────────────────────

export type UpcomingRow = {
  id: number;
  title: string;
  date_label: string;
  details: string;
  image_key: string | null;
  link_url: string;
  sort_order: number;
};

export function listUpcoming(): UpcomingRow[] {
  return db().prepare(`SELECT * FROM upcoming_events ORDER BY sort_order, id`).all() as UpcomingRow[];
}

export type PortfolioRow = { id: number; image_key: string; width: number; height: number; caption: string; sort_order: number };

export function listPortfolio(limit = 500): PortfolioRow[] {
  return db().prepare(`SELECT * FROM portfolio ORDER BY sort_order, id DESC LIMIT ?`).all(limit) as PortfolioRow[];
}
