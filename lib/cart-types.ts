// Partilhado entre cliente e servidor.
export type CartItem = { type: "photo"; photoId: number } | { type: "pack"; eventId: number };

export type QuoteLine = {
  type: "photo" | "pack";
  photoId?: number;
  eventId: number;
  eventTitle: string;
  label: string;
  thumbKey: string | null;
  priceCents: number;
};

export type Quote = {
  lines: QuoteLine[];
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  discount: { code: string; description: string } | null;
  discountError: string | null;
  /** Itens do carrinho que deixaram de existir ou ficaram cobertos por um pack. */
  dropped: CartItem[];
};

export function cartItemKey(item: CartItem): string {
  return item.type === "photo" ? `photo:${item.photoId}` : `pack:${item.eventId}`;
}
