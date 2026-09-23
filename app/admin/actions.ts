"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { checkPassword, createSession, destroySession, requireAdmin } from "@/lib/auth";
import { getEvent, getOrder, getPhoto, setPhotoBibs } from "@/lib/repo";
import { parseBibs, parseEuros, slugify } from "@/lib/format";
import { removePhotoFiles } from "@/lib/storage";
import { extendDownload, markPaid, sendDownloadEmail } from "@/lib/orders";

export type FormState = { error?: string; ok?: string } | undefined;

// ── Sessão ───────────────────────────────────────────────

export async function login(_prev: FormState, form: FormData): Promise<FormState> {
  // Atraso fixo para travar tentativas de força bruta.
  await new Promise((r) => setTimeout(r, 600));
  if (!checkPassword(String(form.get("password") ?? ""))) return { error: "Password incorreta." };
  await createSession();
  redirect("/admin");
}

export async function logout() {
  await destroySession();
  redirect("/admin/login");
}

// ── Eventos ──────────────────────────────────────────────

function readEventForm(form: FormData) {
  const title = String(form.get("title") ?? "").trim();
  const slug = slugify(String(form.get("slug") ?? "") || title);
  const price = parseEuros(String(form.get("price_photo") ?? ""));
  const packRaw = String(form.get("price_pack") ?? "").trim();
  const pack = packRaw ? parseEuros(packRaw) : null;
  if (!title) return { error: "Indique o nome do evento." } as const;
  if (!slug) return { error: "Endereço (slug) inválido." } as const;
  if (price == null || price < 50) return { error: "Preço por fotografia inválido (mínimo 0,50 €)." } as const;
  if (packRaw && (pack == null || pack < 50)) return { error: "Preço do pack inválido." } as const;
  return {
    data: {
      title,
      slug,
      description: String(form.get("description") ?? "").trim(),
      event_date: String(form.get("event_date") ?? "") || null,
      location: String(form.get("location") ?? "").trim(),
      price_photo_cents: price,
      price_pack_cents: pack,
    },
  } as const;
}

function isUniqueError(err: unknown) {
  return err instanceof Error && /UNIQUE/.test(err.message);
}

export async function createEvent(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = readEventForm(form);
  if ("error" in parsed) return { error: parsed.error };
  let id: number;
  try {
    const d = parsed.data;
    id = Number(
      db()
        .prepare(
          `INSERT INTO events (title, slug, description, event_date, location, price_photo_cents, price_pack_cents)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(d.title, d.slug, d.description, d.event_date, d.location, d.price_photo_cents, d.price_pack_cents)
        .lastInsertRowid,
    );
  } catch (err) {
    if (isUniqueError(err)) return { error: "Já existe um evento com esse endereço." };
    throw err;
  }
  redirect(`/admin/eventos/${id}`);
}

export async function updateEvent(id: number, _prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = readEventForm(form);
  if ("error" in parsed) return { error: parsed.error };
  const d = parsed.data;
  try {
    db()
      .prepare(
        `UPDATE events SET title=?, slug=?, description=?, event_date=?, location=?, price_photo_cents=?,
           price_pack_cents=?, published=? WHERE id=?`,
      )
      .run(
        d.title,
        d.slug,
        d.description,
        d.event_date,
        d.location,
        d.price_photo_cents,
        d.price_pack_cents,
        form.get("published") ? 1 : 0,
        id,
      );
  } catch (err) {
    if (isUniqueError(err)) return { error: "Já existe um evento com esse endereço." };
    throw err;
  }
  revalidatePath("/", "layout");
  return { ok: "Guardado." };
}

export async function deleteEvent(id: number) {
  await requireAdmin();
  const photos = db().prepare(`SELECT file_key, original_ext FROM photos WHERE event_id = ?`).all(id) as {
    file_key: string;
    original_ext: string;
  }[];
  db().prepare(`DELETE FROM events WHERE id = ?`).run(id);
  await Promise.all(photos.map((p) => removePhotoFiles(p.file_key, p.original_ext)));
  redirect("/admin/eventos");
}

// ── Fotografias ──────────────────────────────────────────

export async function savePhotoBibs(photoId: number, form: FormData) {
  await requireAdmin();
  setPhotoBibs(photoId, parseBibs(String(form.get("bibs") ?? "")));
  revalidatePath("/admin/eventos");
}

export async function setCover(eventId: number, photoId: number) {
  await requireAdmin();
  db().prepare(`UPDATE events SET cover_photo_id = ? WHERE id = ?`).run(photoId, eventId);
  revalidatePath(`/admin/eventos/${eventId}`);
}

export async function deletePhoto(photoId: number) {
  await requireAdmin();
  const photo = getPhoto(photoId);
  if (!photo) return;
  db().prepare(`DELETE FROM photos WHERE id = ?`).run(photoId);
  await removePhotoFiles(photo.file_key, photo.original_ext);
  revalidatePath(`/admin/eventos/${photo.event_id}`);
}

/** Atribui dorsais em massa a partir de linhas "nome-do-ficheiro: 123, 456". */
export async function bulkBibs(eventId: number, _prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  if (!getEvent(eventId)) return { error: "Evento não encontrado." };
  const lines = String(form.get("mapping") ?? "").split(/\r?\n/).filter((l) => l.trim());
  const find = db().prepare(
    `SELECT id FROM photos WHERE event_id = ? AND (original_name = ? OR original_name LIKE ? || '.%' OR CAST(id AS TEXT) = ?)`,
  );
  const add = db().prepare(`INSERT OR IGNORE INTO photo_bibs (photo_id, bib) VALUES (?, ?)`);
  let updated = 0;
  const missing: string[] = [];
  db().transaction(() => {
    for (const line of lines) {
      const [name, bibs] = line.split(/[:;\t]/, 2).map((s) => s?.trim() ?? "");
      const row = find.get(eventId, name, name, name) as { id: number } | undefined;
      if (!row) {
        missing.push(name);
        continue;
      }
      for (const b of parseBibs(bibs)) add.run(row.id, b);
      updated++;
    }
  })();
  revalidatePath(`/admin/eventos/${eventId}`);
  return {
    ok: `${updated} fotografia(s) atualizada(s).${missing.length ? ` Não encontradas: ${missing.slice(0, 10).join(", ")}` : ""}`,
  };
}

// ── Descontos ────────────────────────────────────────────

export async function createDiscount(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const code = String(form.get("code") ?? "").trim().toUpperCase();
  const kind = form.get("kind") === "fixed" ? "fixed" : "percent";
  const rawValue = String(form.get("value") ?? "");
  const value = kind === "fixed" ? parseEuros(rawValue) : Number.parseInt(rawValue, 10);
  const eventId = Number(form.get("event_id")) || null;
  const maxUses = Number.parseInt(String(form.get("max_uses") ?? ""), 10) || null;
  const expires = String(form.get("expires_at") ?? "");

  if (!/^[A-Z0-9_-]{3,30}$/.test(code)) return { error: "Código inválido (3–30 letras/números, sem espaços)." };
  if (value == null || !Number.isFinite(value) || value <= 0) return { error: "Valor inválido." };
  if (kind === "percent" && value > 100) return { error: "A percentagem não pode ser superior a 100." };
  try {
    db()
      .prepare(
        `INSERT INTO discount_codes (code, kind, value, event_id, max_uses, expires_at) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(code, kind, value, eventId, maxUses, expires ? `${expires}T23:59:59` : null);
  } catch (err) {
    if (isUniqueError(err)) return { error: "Esse código já existe." };
    throw err;
  }
  revalidatePath("/admin/descontos");
  return { ok: `Código ${code} criado.` };
}

export async function toggleDiscount(id: number) {
  await requireAdmin();
  db().prepare(`UPDATE discount_codes SET active = 1 - active WHERE id = ?`).run(id);
  revalidatePath("/admin/descontos");
}

export async function deleteDiscount(id: number) {
  await requireAdmin();
  db().prepare(`DELETE FROM discount_codes WHERE id = ?`).run(id);
  revalidatePath("/admin/descontos");
}

// ── Encomendas ───────────────────────────────────────────

export async function adminMarkPaid(orderId: number) {
  await requireAdmin();
  await markPaid(orderId, "manual");
  revalidatePath("/admin/encomendas");
}

export async function resendEmail(orderId: number) {
  await requireAdmin();
  extendDownload(orderId);
  const order = getOrder(orderId);
  if (order) await sendDownloadEmail(order);
  revalidatePath("/admin/encomendas");
}
