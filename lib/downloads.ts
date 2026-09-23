import "server-only";
import { config } from "./config";
import { slugify } from "./format";
import type { PhotoRow } from "./repo";

export function downloadName(photo: Pick<PhotoRow, "id" | "original_ext">, eventTitle: string): string {
  return `${slugify(config.siteName)}-${slugify(eventTitle)}-${photo.id}.${photo.original_ext}`;
}

export const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  tif: "image/tiff",
};
