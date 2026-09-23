import fs from "node:fs";
import { Readable } from "node:stream";
import { getOrderByToken, getOrderPhotos } from "@/lib/repo";
import { isDownloadValid } from "@/lib/orders";
import { filePath } from "@/lib/storage";
import { downloadName, MIME } from "@/lib/downloads";

export async function GET(_req: Request, ctx: { params: Promise<{ token: string; photoId: string }> }) {
  const { token, photoId } = await ctx.params;
  const order = getOrderByToken(token);
  if (!isDownloadValid(order)) return new Response("Link inválido ou expirado", { status: 403 });

  // Só entrega fotografias que pertencem a esta encomenda.
  const photo = getOrderPhotos(order.id).find((p) => p.id === Number(photoId));
  if (!photo) return new Response("Não encontrado", { status: 404 });

  const p = filePath("originals", photo.file_key, photo.original_ext);
  let size: number;
  try {
    size = (await fs.promises.stat(p)).size;
  } catch {
    return new Response("Ficheiro indisponível", { status: 404 });
  }
  return new Response(Readable.toWeb(fs.createReadStream(p)) as ReadableStream, {
    headers: {
      "Content-Type": MIME[photo.original_ext] ?? "application/octet-stream",
      "Content-Length": String(size),
      "Content-Disposition": `attachment; filename="${downloadName(photo, photo.event_title)}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
