"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { checkPassword, createSession, destroySession, requireAdmin } from "@/lib/auth";
import crypto from "node:crypto";
import { getEvent, getOrder } from "@/lib/repo";
import { parseEuros, slugify } from "@/lib/format";
import { removeFile, removePhotoFiles, writeFile } from "@/lib/storage";
import { processLogo, processSiteImage } from "@/lib/images";
import { getSettings, setSetting, type SettingKey } from "@/lib/settings";
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
  const carPackRaw = String(form.get("price_car_pack") ?? "").trim();
  const carPack = carPackRaw ? parseEuros(carPackRaw) : null;
  if (!title) return { error: "Indique o nome do evento." } as const;
  if (!slug) return { error: "Endereço (slug) inválido." } as const;
  if (price == null || price < 50) return { error: "Preço por fotografia inválido (mínimo 0,50 €)." } as const;
  if (packRaw && (pack == null || pack < 50)) return { error: "Preço do pack do evento inválido." } as const;
  if (carPackRaw && (carPack == null || carPack < 50)) return { error: "Preço do pack de piloto inválido." } as const;
  return {
    data: {
      title,
      slug,
      description: String(form.get("description") ?? "").trim(),
      event_date: String(form.get("event_date") ?? "") || null,
      location: String(form.get("location") ?? "").trim(),
      price_photo_cents: price,
      price_car_pack_cents: carPack,
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
          `INSERT INTO events (title, slug, description, event_date, location, price_photo_cents, price_car_pack_cents, price_pack_cents)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(d.title, d.slug, d.description, d.event_date, d.location, d.price_photo_cents, d.price_car_pack_cents, d.price_pack_cents)
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
           price_car_pack_cents=?, price_pack_cents=?, published=? WHERE id=?`,
      )
      .run(
        d.title,
        d.slug,
        d.description,
        d.event_date,
        d.location,
        d.price_photo_cents,
        d.price_car_pack_cents,
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

// ── Carros / pilotos ─────────────────────────────────────

function cleanNumber(v: FormDataEntryValue | string | null | undefined) {
  return String(v ?? "").trim().replace(/^#/, "").toUpperCase().slice(0, 10);
}

export async function addCar(eventId: number, _prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const number = cleanNumber(form.get("number"));
  if (!/^[A-Z0-9-]{1,10}$/.test(number)) return { error: "Número do carro inválido." };
  try {
    db()
      .prepare(`INSERT INTO event_cars (event_id, number, driver, team) VALUES (?, ?, ?, ?)`)
      .run(eventId, number, String(form.get("driver") ?? "").trim().slice(0, 80), String(form.get("team") ?? "").trim().slice(0, 80));
  } catch (err) {
    if (isUniqueError(err)) return { error: `O carro #${number} já existe neste evento.` };
    throw err;
  }
  revalidatePath(`/admin/eventos/${eventId}`);
  return { ok: `Carro #${number} adicionado.` };
}

/** Importa a lista de inscritos: uma linha por carro, "número; piloto; equipa" (ou separado por tabs/vírgulas). */
export async function importCars(eventId: number, _prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const lines = String(form.get("list") ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const upsert = db().prepare(
    `INSERT INTO event_cars (event_id, number, driver, team) VALUES (?, ?, ?, ?)
     ON CONFLICT(event_id, number) DO UPDATE SET driver = excluded.driver, team = excluded.team`,
  );
  let n = 0;
  const bad: string[] = [];
  db().transaction(() => {
    for (const line of lines) {
      const parts = line.split(/\t|;|,/).map((p) => p.trim());
      const number = cleanNumber(parts[0]);
      if (!/^[A-Z0-9-]{1,10}$/.test(number)) {
        bad.push(line.slice(0, 30));
        continue;
      }
      upsert.run(eventId, number, (parts[1] ?? "").slice(0, 80), (parts[2] ?? "").slice(0, 80));
      n++;
    }
  })();
  revalidatePath(`/admin/eventos/${eventId}`);
  return { ok: `${n} carro(s) importado(s).${bad.length ? ` Linhas ignoradas: ${bad.slice(0, 5).join(" | ")}` : ""}` };
}

export async function updateCar(carId: number, eventId: number, form: FormData) {
  await requireAdmin();
  const number = cleanNumber(form.get("number"));
  if (!/^[A-Z0-9-]{1,10}$/.test(number)) return;
  try {
    db()
      .prepare(`UPDATE event_cars SET number = ?, driver = ?, team = ? WHERE id = ? AND event_id = ?`)
      .run(number, String(form.get("driver") ?? "").trim().slice(0, 80), String(form.get("team") ?? "").trim().slice(0, 80), carId, eventId);
  } catch (err) {
    if (!isUniqueError(err)) throw err;
  }
  revalidatePath(`/admin/eventos/${eventId}`);
}

export async function deleteCar(carId: number, eventId: number) {
  await requireAdmin();
  // As fotos não são apagadas, apenas deixam de estar associadas ao carro.
  db().prepare(`DELETE FROM event_cars WHERE id = ? AND event_id = ?`).run(carId, eventId);
  revalidatePath(`/admin/eventos/${eventId}`);
}

// ── Fotografias ──────────────────────────────────────────

/** Ações em massa sobre fotos selecionadas (associar a carro, capa, apagar). */
export async function bulkPhotos(eventId: number, form: FormData) {
  await requireAdmin();
  const ids = form
    .getAll("ids")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);
  const op = String(form.get("op") ?? "");
  const carId = Number(form.get("car_id")) || null;
  if (ids.length === 0) return;
  const d = db();
  // Garante que só mexemos em fotos deste evento e em carros deste evento.
  const own = d
    .prepare(`SELECT id, file_key, original_ext FROM photos WHERE event_id = ? AND id IN (SELECT value FROM json_each(?))`)
    .all(eventId, JSON.stringify(ids)) as { id: number; file_key: string; original_ext: string }[];
  const car = carId ? d.prepare(`SELECT id FROM event_cars WHERE id = ? AND event_id = ?`).get(carId, eventId) : null;

  if (op === "assign" && car) {
    const ins = d.prepare(`INSERT OR IGNORE INTO photo_cars (photo_id, car_id) VALUES (?, ?)`);
    d.transaction(() => own.forEach((p) => ins.run(p.id, carId)))();
  } else if (op === "move" && car) {
    const del = d.prepare(`DELETE FROM photo_cars WHERE photo_id = ?`);
    const ins = d.prepare(`INSERT INTO photo_cars (photo_id, car_id) VALUES (?, ?)`);
    d.transaction(() => own.forEach((p) => (del.run(p.id), ins.run(p.id, carId))))();
  } else if (op === "unassign") {
    const del = d.prepare(`DELETE FROM photo_cars WHERE photo_id = ?`);
    d.transaction(() => own.forEach((p) => del.run(p.id)))();
  } else if (op === "event-cover" && own[0]) {
    d.prepare(`UPDATE events SET cover_photo_id = ? WHERE id = ?`).run(own[0].id, eventId);
  } else if (op === "car-cover" && car && own[0]) {
    d.prepare(`INSERT OR IGNORE INTO photo_cars (photo_id, car_id) VALUES (?, ?)`).run(own[0].id, carId);
    d.prepare(`UPDATE event_cars SET cover_photo_id = ? WHERE id = ?`).run(own[0].id, carId);
  } else if (op === "delete") {
    d.transaction(() => own.forEach((p) => d.prepare(`DELETE FROM photos WHERE id = ?`).run(p.id)))();
    await Promise.all(own.map((p) => removePhotoFiles(p.file_key, p.original_ext)));
  }
  revalidatePath(`/admin/eventos/${eventId}`);
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

// ── Conteúdo do site ─────────────────────────────────────

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

function uploadedImage(form: FormData, field: string): File | null {
  const f = form.get(field);
  return f instanceof File && f.size > 0 && IMAGE_TYPES.includes(f.type) ? f : null;
}

/** Guarda uma imagem do site e devolve "uuid.jpg" (ou .png para o logótipo). */
async function storeSiteImage(file: File, kind: "photo" | "logo", maxSize = 2400) {
  const key = crypto.randomUUID();
  const buf = Buffer.from(await file.arrayBuffer());
  if (kind === "logo") {
    await writeFile("site", key, "png", await processLogo(buf));
    return { file: `${key}.png`, width: 0, height: 0 };
  }
  const img = await processSiteImage(buf, maxSize);
  await writeFile("site", key, "jpg", img.data);
  return { file: `${key}.jpg`, width: img.width, height: img.height };
}

async function removeSiteImage(file: string | null | undefined) {
  if (!file) return;
  const [key, ext] = file.split(".");
  await removeFile("site", key, ext);
}

export async function saveSettings(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const text: SettingKey[] = ["tagline_pt", "tagline_en", "about_pt", "about_en", "contact_email", "phone", "instagram", "facebook"];
  for (const k of text) setSetting(k, String(form.get(k) ?? "").trim().slice(0, 5000));
  const current = getSettings();
  try {
    for (const [field, key, kind] of [
      ["logo", "logo_key", "logo"],
      ["hero", "hero_key", "photo"],
      ["about_image", "about_image_key", "photo"],
    ] as const) {
      const file = uploadedImage(form, field);
      if (file) {
        const stored = await storeSiteImage(file, kind);
        await removeSiteImage(current[key]);
        setSetting(key, stored.file);
      } else if (form.get(`remove_${field}`)) {
        await removeSiteImage(current[key]);
        setSetting(key, "");
      }
    }
  } catch {
    return { error: "Não foi possível processar uma das imagens." };
  }
  revalidatePath("/", "layout");
  return { ok: "Guardado." };
}

export async function addUpcoming(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const title = String(form.get("title") ?? "").trim();
  if (!title) return { error: "Indique o nome do evento." };
  const link = String(form.get("link_url") ?? "").trim();
  if (link && !/^https?:\/\//.test(link)) return { error: "O link deve começar por https://" };
  const file = uploadedImage(form, "image");
  const image = file ? (await storeSiteImage(file, "photo", 1400)).file : null;
  db()
    .prepare(`INSERT INTO upcoming_events (title, date_label, details, image_key, link_url, sort_order) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(title, String(form.get("date_label") ?? "").trim(), String(form.get("details") ?? "").trim(), image, link, Number(form.get("sort_order")) || 0);
  revalidatePath("/", "layout");
  return { ok: "Próximo evento adicionado." };
}

export async function deleteUpcoming(id: number) {
  await requireAdmin();
  const row = db().prepare(`SELECT image_key FROM upcoming_events WHERE id = ?`).get(id) as { image_key: string | null } | undefined;
  db().prepare(`DELETE FROM upcoming_events WHERE id = ?`).run(id);
  await removeSiteImage(row?.image_key);
  revalidatePath("/", "layout");
}

export async function addPortfolio(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const files = form.getAll("images").filter((f): f is File => f instanceof File && f.size > 0 && IMAGE_TYPES.includes(f.type));
  if (files.length === 0) return { error: "Escolha pelo menos uma imagem (JPG, PNG ou WebP)." };
  const ins = db().prepare(`INSERT INTO portfolio (image_key, width, height, caption) VALUES (?, ?, ?, ?)`);
  for (const f of files) {
    const stored = await storeSiteImage(f, "photo", 2000);
    ins.run(stored.file, stored.width, stored.height, String(form.get("caption") ?? "").trim());
  }
  revalidatePath("/", "layout");
  return { ok: `${files.length} imagem(ns) adicionada(s).` };
}

export async function deletePortfolio(id: number) {
  await requireAdmin();
  const row = db().prepare(`SELECT image_key FROM portfolio WHERE id = ?`).get(id) as { image_key: string } | undefined;
  db().prepare(`DELETE FROM portfolio WHERE id = ?`).run(id);
  await removeSiteImage(row?.image_key);
  revalidatePath("/", "layout");
}
