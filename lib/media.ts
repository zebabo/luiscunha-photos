export function thumbUrl(key: string | null | undefined): string {
  return key ? `/media/thumbs/${key}.jpg` : "";
}

export function previewUrl(key: string): string {
  return `/media/previews/${key}.jpg`;
}

/** Imagens do site guardadas como "uuid.jpg" / "uuid.png". */
export function siteImageUrl(file: string | null | undefined): string {
  return file ? `/media/site/${file}` : "";
}
