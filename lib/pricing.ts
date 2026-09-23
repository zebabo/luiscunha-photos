import "server-only";
import { db } from "./db";
import { getDiscountByCode, type DiscountRow } from "./repo";
import { formatEUR } from "./format";
import type { CartItem, Quote, QuoteLine } from "./cart-types";

const MAX_ITEMS = 1000;

export function parseCartItems(input: unknown): CartItem[] {
  if (!Array.isArray(input)) return [];
  const out: CartItem[] = [];
  for (const raw of input.slice(0, MAX_ITEMS)) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    if (r.type === "photo" && Number.isInteger(r.photoId)) out.push({ type: "photo", photoId: r.photoId as number });
    if (r.type === "pack" && Number.isInteger(r.eventId)) out.push({ type: "pack", eventId: r.eventId as number });
  }
  return out;
}

function discountProblem(d: DiscountRow | undefined): string | null {
  if (!d || !d.active) return "Código de desconto inválido.";
  if (d.expires_at && new Date(d.expires_at).getTime() < Date.now()) return "Este código de desconto expirou.";
  if (d.max_uses != null && d.used_count >= d.max_uses) return "Este código de desconto já foi totalmente utilizado.";
  return null;
}

/** Calcula preços sempre no servidor — o carrinho do browser nunca é confiável. */
export function buildQuote(items: CartItem[], discountCode?: string | null): Quote {
  const d = db();
  const dropped: CartItem[] = [];
  const lines: QuoteLine[] = [];

  const packEvents = new Set<number>();
  for (const item of items) {
    if (item.type !== "pack" || packEvents.has(item.eventId)) continue;
    const ev = d
      .prepare(
        `SELECT e.id, e.title, e.price_pack_cents,
           (SELECT COUNT(*) FROM photos p WHERE p.event_id = e.id) AS n,
           COALESCE((SELECT file_key FROM photos p WHERE p.id = e.cover_photo_id AND p.event_id = e.id),
                    (SELECT file_key FROM photos p WHERE p.event_id = e.id ORDER BY p.original_name, p.id LIMIT 1)) AS cover
         FROM events e WHERE e.id = ? AND e.published = 1`,
      )
      .get(item.eventId) as
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
      label: `Pack completo — todas as fotos (${ev.n})`,
      thumbKey: ev.cover,
      priceCents: ev.price_pack_cents,
    });
  }

  const seenPhotos = new Set<number>();
  const photoStmt = d.prepare(
    `SELECT p.id, p.file_key, p.original_name, e.id AS event_id, e.title, e.price_photo_cents
     FROM photos p JOIN events e ON e.id = p.event_id WHERE p.id = ? AND e.published = 1`,
  );
  for (const item of items) {
    if (item.type !== "photo" || seenPhotos.has(item.photoId)) continue;
    seenPhotos.add(item.photoId);
    const p = photoStmt.get(item.photoId) as
      | { id: number; file_key: string; original_name: string; event_id: number; title: string; price_photo_cents: number }
      | undefined;
    if (!p || packEvents.has(p.event_id)) {
      dropped.push(item);
      continue;
    }
    lines.push({
      type: "photo",
      photoId: p.id,
      eventId: p.event_id,
      eventTitle: p.title,
      label: `Fotografia #${p.id}`,
      thumbKey: p.file_key,
      priceCents: p.price_photo_cents,
    });
  }

  const subtotalCents = lines.reduce((s, l) => s + l.priceCents, 0);
  let discountCents = 0;
  let discount: Quote["discount"] = null;
  let discountError: string | null = null;

  const code = discountCode?.trim();
  if (code) {
    const row = getDiscountByCode(code);
    discountError = discountProblem(row);
    if (!discountError && row) {
      const eligible = lines
        .filter((l) => row.event_id == null || l.eventId === row.event_id)
        .reduce((s, l) => s + l.priceCents, 0);
      if (eligible === 0) {
        discountError = "Este código não se aplica às fotografias no carrinho.";
      } else {
        discountCents =
          row.kind === "percent"
            ? Math.round((eligible * Math.min(100, row.value)) / 100)
            : Math.min(row.value, eligible);
        discount = {
          code: row.code,
          description: row.kind === "percent" ? `${row.value}% de desconto` : `${formatEUR(row.value)} de desconto`,
        };
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
