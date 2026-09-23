import "server-only";
import crypto from "node:crypto";
import { db } from "./db";
import { config } from "./config";
import { getOrder, getOrderPhotos, type OrderRow } from "./repo";
import { downloadEmail, sendMail } from "./email";
import { formatDate } from "./format";
import type { Quote } from "./cart-types";

export function randomToken(bytes = 24): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function createOrder(input: {
  email: string;
  name: string;
  nif: string;
  quote: Quote;
  provider: string;
}): OrderRow {
  const d = db();
  const { quote } = input;
  const id = d.transaction(() => {
    const res = d
      .prepare(
        `INSERT INTO orders (public_id, email, name, nif, subtotal_cents, discount_cents, total_cents, discount_code, provider)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        randomToken(16),
        input.email,
        input.name,
        input.nif,
        quote.subtotalCents,
        quote.discountCents,
        quote.totalCents,
        quote.discount?.code ?? null,
        input.provider,
      );
    const orderId = Number(res.lastInsertRowid);
    const ins = d.prepare(
      `INSERT INTO order_items (order_id, kind, photo_id, event_id, label, price_cents) VALUES (?, ?, ?, ?, ?, ?)`,
    );
    for (const l of quote.lines) {
      ins.run(orderId, l.type, l.photoId ?? null, l.eventId, `${l.eventTitle} — ${l.label}`, l.priceCents);
    }
    return orderId;
  })();
  return getOrder(id)!;
}

export function setProviderRef(orderId: number, ref: string) {
  db().prepare(`UPDATE orders SET provider_ref = ? WHERE id = ?`).run(ref, orderId);
}

export function markFailed(orderId: number, status: "failed" | "expired") {
  db().prepare(`UPDATE orders SET status = ? WHERE id = ? AND status = 'pending'`).run(status, orderId);
}

export function downloadUrl(order: Pick<OrderRow, "download_token">): string {
  return `${config.siteUrl}/encomenda/${order.download_token}`;
}

/**
 * Marca a encomenda como paga (idempotente), gera o link de download e envia o email.
 * Chamado pelo webhook do Stripe, pelo pagamento de demonstração ou manualmente no admin.
 */
export async function markPaid(orderId: number, providerRef?: string): Promise<OrderRow | undefined> {
  const d = db();
  const changed = d.transaction(() => {
    const order = getOrder(orderId);
    if (!order || order.status === "paid") return false;
    const expires = new Date(Date.now() + config.downloadDays * 86400_000).toISOString();
    d.prepare(
      `UPDATE orders SET status = 'paid', paid_at = datetime('now'), download_token = ?, download_expires_at = ?,
         provider_ref = COALESCE(?, provider_ref) WHERE id = ?`,
    ).run(randomToken(), expires, providerRef ?? null, orderId);
    if (order.discount_code) {
      d.prepare(`UPDATE discount_codes SET used_count = used_count + 1 WHERE code = ?`).run(order.discount_code);
    }
    return true;
  })();
  const order = getOrder(orderId);
  if (changed && order) await sendDownloadEmail(order);
  return order;
}

export async function sendDownloadEmail(order: OrderRow) {
  if (order.status !== "paid" || !order.download_token) return;
  try {
    const mail = downloadEmail({
      name: order.name,
      url: downloadUrl(order),
      photoCount: getOrderPhotos(order.id).length,
      expires: formatDate(order.download_expires_at),
    });
    await sendMail({ to: order.email, ...mail });
  } catch (err) {
    // O pagamento fica registado mesmo que o email falhe; pode ser reenviado no admin.
    console.error(`[email] Falha ao enviar encomenda ${order.id}:`, err);
  }
}

export function extendDownload(orderId: number) {
  const expires = new Date(Date.now() + config.downloadDays * 86400_000).toISOString();
  db().prepare(`UPDATE orders SET download_expires_at = ? WHERE id = ? AND status = 'paid'`).run(expires, orderId);
}

export function isDownloadValid(order: OrderRow | undefined): order is OrderRow {
  return (
    !!order &&
    order.status === "paid" &&
    !!order.download_expires_at &&
    new Date(order.download_expires_at).getTime() > Date.now()
  );
}
