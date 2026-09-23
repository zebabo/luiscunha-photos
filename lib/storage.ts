import "server-only";
import fs from "node:fs";
import path from "node:path";
import { config } from "./config";

/**
 * Armazenamento local. Os originais ficam numa pasta privada que nunca é servida
 * diretamente; só as pré-visualizações com marca de água são públicas.
 * Para escalar, este módulo é o único sítio a trocar por S3 / Cloudflare R2.
 */
export type Variant = "originals" | "previews" | "thumbs";

const KEY_RE = /^[a-f0-9-]{36}$/;

export function isValidKey(key: string): boolean {
  return KEY_RE.test(key);
}

function dir(variant: Variant): string {
  const d = path.join(config.dataDir, "photos", variant);
  fs.mkdirSync(d, { recursive: true });
  return d;
}

export function filePath(variant: Variant, key: string, ext = "jpg"): string {
  if (!isValidKey(key) || !/^[a-z0-9]{2,5}$/.test(ext)) throw new Error("Chave inválida");
  return path.join(dir(variant), `${key}.${ext}`);
}

export async function writeFile(variant: Variant, key: string, ext: string, data: Buffer) {
  await fs.promises.writeFile(filePath(variant, key, ext), data);
}

export async function removePhotoFiles(key: string, originalExt: string) {
  await Promise.all([
    fs.promises.rm(filePath("originals", key, originalExt), { force: true }),
    fs.promises.rm(filePath("previews", key), { force: true }),
    fs.promises.rm(filePath("thumbs", key), { force: true }),
  ]);
}
