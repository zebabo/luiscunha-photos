export function thumbUrl(key: string | null | undefined): string {
  return key ? `/media/thumbs/${key}.jpg` : "";
}

export function previewUrl(key: string): string {
  return `/media/previews/${key}.jpg`;
}
