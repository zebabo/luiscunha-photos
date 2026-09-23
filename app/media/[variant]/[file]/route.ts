import fs from "node:fs";
import { Readable } from "node:stream";
import { filePath, isValidKey } from "@/lib/storage";

const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png" };

// Serve apenas pré-visualizações com marca de água e imagens do site. Os originais nunca passam por aqui.
export async function GET(_req: Request, ctx: { params: Promise<{ variant: string; file: string }> }) {
  const { variant, file } = await ctx.params;
  const [key, ext, extra] = file.split(".");
  const allowed = variant === "site" ? ["jpg", "png"] : ["jpg"];
  if (
    !["thumbs", "previews", "site"].includes(variant) ||
    extra !== undefined ||
    !allowed.includes(ext) ||
    !isValidKey(key)
  ) {
    return new Response("Não encontrado", { status: 404 });
  }
  const p = filePath(variant as "thumbs" | "previews" | "site", key, ext);
  let size: number;
  try {
    size = (await fs.promises.stat(p)).size;
  } catch {
    return new Response("Não encontrado", { status: 404 });
  }
  return new Response(Readable.toWeb(fs.createReadStream(p)) as ReadableStream, {
    headers: {
      "Content-Type": TYPES[ext],
      "Content-Length": String(size),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
