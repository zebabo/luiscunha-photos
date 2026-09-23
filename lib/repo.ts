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
  price_pack_cents: number | null;
  cover_photo_id: number | null;
  published: number;
  created_at: string;
};

export type EventWithStats = EventRow & { photo_count: number; cover_key: string | null };

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

export type PhotoWithBibs = PhotoRow & { bibs: string[] };

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
  kind: "photo" | "pack";
  photo_id: number | null;
  event_id: number | null;
  label: string;
  price_cents: number;
};

const EVENT_STATS_SQL = `
  SELECT e.*,
    (SELECT COUNT(*) FROM photos p WHERE p.event_id = e.id) AS photo_count,
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

// ── Fotografias ──────────────────────────────────────────

function attachBibs(photos: PhotoRow[]): PhotoWithBibs[] {
  if (photos.length === 0) return [];
  const ids = photos.map((p) => p.id);
  const rows = db()
    .prepare(
      `SELECT photo_id, bib FROM photo_bibs WHERE photo_id IN (SELECT value FROM json_each(?)) ORDER BY bib`,
    )
    .all(JSON.stringify(ids)) as { photo_id: number; bib: string }[];
  const map = new Map<number, string[]>();
  for (const r of rows) {
    const list = map.get(r.photo_id) ?? [];
    list.push(r.bib);
    map.set(r.photo_id, list);
  }
  return photos.map((p) => ({ ...p, bibs: map.get(p.id) ?? [] }));
}

export function listEventPhotos(eventId: number, bib?: string): PhotoWithBibs[] {
  const rows = bib
    ? db()
        .prepare(
          `SELECT p.* FROM photos p JOIN photo_bibs b ON b.photo_id = p.id
           WHERE p.event_id = ? AND b.bib = ? ORDER BY p.original_name, p.id`,
        )
        .all(eventId, bib.toUpperCase())
    : db()
        .prepare(`SELECT * FROM photos WHERE event_id = ? ORDER BY original_name, id`)
        .all(eventId);
  return attachBibs(rows as PhotoRow[]);
}

export type BibSearchResult = PhotoWithBibs & { event_slug: string; event_title: string; price_photo_cents: number };

export function searchPublishedByBib(bib: string): BibSearchResult[] {
  const rows = db()
    .prepare(
      `SELECT p.*, e.slug AS event_slug, e.title AS event_title, e.price_photo_cents
       FROM photos p
       JOIN photo_bibs b ON b.photo_id = p.id
       JOIN events e ON e.id = p.event_id
       WHERE e.published = 1 AND b.bib = ?
       ORDER BY e.event_date DESC, p.original_name, p.id
       LIMIT 500`,
    )
    .all(bib.toUpperCase()) as (PhotoRow & { event_slug: string; event_title: string; price_photo_cents: number })[];
  const withBibs = attachBibs(rows);
  return withBibs as BibSearchResult[];
}

export function getPhoto(id: number): PhotoRow | undefined {
  return db().prepare(`SELECT * FROM photos WHERE id = ?`).get(id) as PhotoRow | undefined;
}

export function setPhotoBibs(photoId: number, bibs: string[]) {
  const d = db();
  d.transaction(() => {
    d.prepare(`DELETE FROM photo_bibs WHERE photo_id = ?`).run(photoId);
    const ins = d.prepare(`INSERT OR IGNORE INTO photo_bibs (photo_id, bib) VALUES (?, ?)`);
    for (const b of bibs) ins.run(photoId, b);
  })();
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

/** Todas as fotografias a que uma encomenda dá direito (fotos avulsas + packs completos). */
export function getOrderPhotos(orderId: number): (PhotoRow & { event_title: string })[] {
  return db()
    .prepare(
      `SELECT DISTINCT p.*, e.title AS event_title FROM photos p
       JOIN events e ON e.id = p.event_id
       WHERE p.id IN (SELECT photo_id FROM order_items WHERE order_id = ? AND kind = 'photo')
          OR p.event_id IN (SELECT event_id FROM order_items WHERE order_id = ? AND kind = 'pack')
       ORDER BY e.title, p.original_name, p.id`,
    )
    .all(orderId, orderId) as (PhotoRow & { event_title: string })[];
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
