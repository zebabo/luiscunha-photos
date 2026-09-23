import crypto from "node:crypto";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { getEvent } from "@/lib/repo";
import { ACCEPTED_TYPES, processUpload } from "@/lib/images";
import { removePhotoFiles, writeFile } from "@/lib/storage";

const MAX_BYTES = 60 * 1024 * 1024;

/** Upload de uma fotografia (o browser envia uma a uma para mostrar progresso), opcionalmente já associada a um carro. */
export async function POST(req: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Sessão expirada." }, { status: 401 });

  const form = await req.formData();
  const eventId = Number(form.get("eventId"));
  const carId = Number(form.get("carId")) || null;
  const file = form.get("file");
  if (!getEvent(eventId)) return Response.json({ error: "Evento não encontrado." }, { status: 404 });
  if (carId && !db().prepare(`SELECT 1 FROM event_cars WHERE id = ? AND event_id = ?`).get(carId, eventId)) {
    return Response.json({ error: "Carro não encontrado neste evento." }, { status: 400 });
  }
  if (!(file instanceof File)) return Response.json({ error: "Ficheiro em falta." }, { status: 400 });

  const ext = ACCEPTED_TYPES[file.type];
  if (!ext) return Response.json({ error: `${file.name}: formato não suportado (use JPG, PNG, WebP ou TIFF).` }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: `${file.name}: ficheiro demasiado grande.` }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = crypto.randomUUID();
  let processed;
  try {
    processed = await processUpload(buffer);
  } catch {
    return Response.json({ error: `${file.name}: imagem inválida ou corrompida.` }, { status: 400 });
  }

  try {
    await Promise.all([
      writeFile("originals", key, ext, buffer),
      writeFile("previews", key, "jpg", processed.preview),
      writeFile("thumbs", key, "jpg", processed.thumb),
    ]);
    const d = db();
    const id = d.transaction(() => {
      const photoId = Number(
        d
          .prepare(`INSERT INTO photos (event_id, file_key, original_ext, original_name, width, height) VALUES (?, ?, ?, ?, ?, ?)`)
          .run(eventId, key, ext, file.name.replace(/\.[^.]+$/, "").slice(0, 200), processed.width, processed.height)
          .lastInsertRowid,
      );
      if (carId) d.prepare(`INSERT INTO photo_cars (photo_id, car_id) VALUES (?, ?)`).run(photoId, carId);
      return photoId;
    })();
    return Response.json({ id, key });
  } catch (err) {
    await removePhotoFiles(key, ext);
    console.error("[upload]", err);
    return Response.json({ error: `${file.name}: erro ao guardar.` }, { status: 500 });
  }
}
