import fs from "node:fs";
import { Readable } from "node:stream";
import archiver from "archiver";
import { getOrderByToken, getOrderPhotos } from "@/lib/repo";
import { isDownloadValid } from "@/lib/orders";
import { filePath } from "@/lib/storage";
import { downloadName } from "@/lib/downloads";
import { config } from "@/lib/config";
import { slugify } from "@/lib/format";

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const order = getOrderByToken(token);
  if (!isDownloadValid(order)) return new Response("Link inválido ou expirado", { status: 403 });

  const photos = getOrderPhotos(order.id);
  // JPEG já vem comprimido: guardar sem recompressão é mais rápido.
  const archive = archiver("zip", { store: true });
  for (const p of photos) {
    const path = filePath("originals", p.file_key, p.original_ext);
    if (fs.existsSync(path)) archive.file(path, { name: downloadName(p, p.event_title) });
  }
  archive.on("error", (err) => console.error("[zip]", err));
  void archive.finalize();

  return new Response(Readable.toWeb(archive) as ReadableStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${slugify(config.siteName)}-encomenda-${order.id}.zip"`,
      "Cache-Control": "private, no-store",
    },
  });
}
