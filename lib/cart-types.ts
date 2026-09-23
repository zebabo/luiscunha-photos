// Partilhado entre cliente e servidor.
export type CartItem =
  | { type: "photo"; photoId: number }
  | { type: "carpack"; carId: number }
  | { type: "pack"; eventId: number };

export type QuoteLine = {
  type: CartItem["type"];
  photoId?: number;
  carId?: number;
  eventId: number;
  eventTitle: string;
  /** Descrição neutra (ex.: "#28 David Karatas") — o texto final é traduzido no cliente. */
  subject: string;
  photoCount: number;
  thumbKey: string | null;
  priceCents: number;
};

export type Quote = {
  lines: QuoteLine[];
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  discount: { code: string; kind: "percent" | "fixed"; value: number } | null;
  discountError: "invalid" | "expired" | "used_up" | "not_applicable" | null;
  /** Itens do carrinho que deixaram de existir ou ficaram cobertos por um pack. */
  dropped: CartItem[];
};

export function cartItemKey(item: CartItem): string {
  if (item.type === "photo") return `photo:${item.photoId}`;
  if (item.type === "carpack") return `carpack:${item.carId}`;
  return `pack:${item.eventId}`;
}

export function carLabel(car: { number: string; driver: string }): string {
  return car.driver ? `#${car.number} ${car.driver}` : `#${car.number}`;
}
