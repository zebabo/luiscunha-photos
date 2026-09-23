import "server-only";
import sharp from "sharp";
import { config } from "./config";
import { getSettings } from "./settings";
import { readFile } from "./storage";

function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Marca de água em texto, em mosaico diagonal (usada enquanto não houver logótipo carregado). */
function textWatermark(width: number, height: number, strong: boolean): Buffer {
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

/** Logótipo do fotógrafo, centrado e semitransparente — como no Pixieset atual. */
async function logoWatermark(logo: Buffer, width: number, height: number, opacity: number): Promise<Buffer> {
  const resized = await sharp(logo)
    .ensureAlpha()
    .resize(Math.round(width * 0.62), Math.round(height * 0.55), { fit: "inside" })
    .toBuffer();
  // Multiplica apenas o canal alfa.
  return sharp(resized).linear([1, 1, 1, opacity], [0, 0, 0, 0]).png().toBuffer();
}

async function watermarked(input: Buffer, logo: Buffer | null, maxSize: number, quality: number, strong: boolean) {
  const resized = await sharp(input)
    .rotate()
    .resize(maxSize, maxSize, { fit: "inside", withoutEnlargement: true })
    .toBuffer({ resolveWithObject: true });
  const { width, height } = resized.info;
  const overlay = logo
    ? { input: await logoWatermark(logo, width, height, strong ? 0.5 : 0.42), gravity: "center" as const }
    : { input: textWatermark(width, height, strong), top: 0, left: 0 };
  return sharp(resized.data).composite([overlay]).jpeg({ quality, mozjpeg: true }).toBuffer();
}

export const ACCEPTED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/tiff": "tif",
};

async function orientedSize(input: Buffer) {
  const meta = await sharp(input).metadata();
  // Com orientação EXIF 5–8 a imagem é rodada 90°, por isso largura e altura trocam.
  const swap = (meta.orientation ?? 1) >= 5;
  const width = (swap ? meta.height : meta.width) ?? 0;
  const height = (swap ? meta.width : meta.height) ?? 0;
  if (!width || !height) throw new Error("Imagem inválida");
  return { width, height };
}

async function currentLogo(): Promise<Buffer | null> {
  const file = getSettings().logo_key;
  if (!file) return null;
  const [key, ext] = file.split(".");
  return readFile("site", key, ext);
}

/** Fotos à venda: gera pré-visualização e miniatura com marca de água. O original fica intacto. */
export async function processUpload(original: Buffer) {
  const { width, height } = await orientedSize(original);
  const logo = await currentLogo();
  const [preview, thumb] = await Promise.all([
    watermarked(original, logo, 1600, 82, true),
    watermarked(original, logo, 640, 76, false),
  ]);
  return { width, height, preview, thumb };
}

/** Imagens do site (capa, portefólio, cartazes): só redimensionadas, sem EXIF. */
export async function processSiteImage(input: Buffer, maxSize = 2400) {
  const out = await sharp(input)
    .rotate()
    .resize(maxSize, maxSize, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 84, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });
  return { data: out.data, width: out.info.width, height: out.info.height };
}

/** Logótipo: PNG com transparência. */
export async function processLogo(input: Buffer) {
  return sharp(input).ensureAlpha().resize(1600, 800, { fit: "inside", withoutEnlargement: true }).png().toBuffer();
}
