import fs from "node:fs";
import { Readable } from "node:stream";
import { filePath, isValidKey } from "@/lib/storage";

// Serve apenas pré-visualizações com marca de água. Os originais nunca passam por aqui.
export async function GET(_req: Request, ctx: { params: Promise<{ variant: string; file: string }> }) {
  const { variant, file } = await ctx.params;
  const key = file.replace(/\.jpg$/, "");
  if ((variant !== "thumbs" && variant !== "previews") || !file.endsWith(".jpg") || !isValidKey(key)) {
    return new Response("Não encontrado", { status: 404 });
  }
  const p = filePath(variant, key);
  let size: number;
  try {
    size = (await fs.promises.stat(p)).size;
  } catch {
    return new Response("Não encontrado", { status: 404 });
  }
  return new Response(Readable.toWeb(fs.createReadStream(p)) as ReadableStream, {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Length": String(size),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
