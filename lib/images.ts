import "server-only";
import sharp from "sharp";
import { config } from "./config";

function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Marca de água em mosaico diagonal, gerada em SVG com o tamanho exato da imagem. */
function watermarkSvg(width: number, height: number, strong: boolean): Buffer {
  const text = escapeXml(config.watermarkText);
  const fontSize = Math.max(14, Math.round(Math.min(width, height) / (strong ? 16 : 12)));
  const tileW = Math.round(fontSize * Math.max(8, text.length * 0.62));
  const tileH = Math.round(fontSize * 4.5);
  const opacity = strong ? 0.38 : 0.3;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs>
    <pattern id="wm" width="${tileW}" height="${tileH}" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)">
      <text x="0" y="${fontSize}" font-family="Helvetica, Arial, sans-serif" font-size="${fontSize}"
        font-weight="700" fill="#ffffff" fill-opacity="${opacity}" stroke="#000000" stroke-opacity="${opacity * 0.35}"
        stroke-width="${Math.max(1, fontSize / 28)}">${text}</text>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#wm)"/>
</svg>`);
}

async function watermarked(input: Buffer, maxSize: number, quality: number, strong: boolean) {
  const resized = await sharp(input)
    .rotate()
    .resize(maxSize, maxSize, { fit: "inside", withoutEnlargement: true })
    .toBuffer({ resolveWithObject: true });
  const { width, height } = resized.info;
  return sharp(resized.data)
    .composite([{ input: watermarkSvg(width, height, strong), top: 0, left: 0 }])
    .jpeg({ quality, mozjpeg: true })
    .toBuffer();
}

export const ACCEPTED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/tiff": "tif",
};

export async function processUpload(original: Buffer) {
  const meta = await sharp(original).rotate().metadata();
  // Após .rotate() as dimensões reportadas podem estar trocadas pela orientação EXIF.
  const swap = (meta.orientation ?? 1) >= 5;
  const width = (swap ? meta.height : meta.width) ?? 0;
  const height = (swap ? meta.width : meta.height) ?? 0;
  if (!width || !height) throw new Error("Imagem inválida");
  const [preview, thumb] = await Promise.all([
    watermarked(original, 1600, 82, true),
    watermarked(original, 640, 76, false),
  ]);
  return { width, height, preview, thumb };
}
