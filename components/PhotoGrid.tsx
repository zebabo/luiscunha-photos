"use client";

import { useCallback, useEffect, useState } from "react";
import { useCart } from "./CartProvider";
import { useI18n } from "./I18nProvider";
import { previewUrl, thumbUrl } from "@/lib/media";
import { formatEUR } from "@/lib/format";
import type { CartItem } from "@/lib/cart-types";

export type GridPhoto = {
  id: number;
  key: string;
  priceCents: number;
  eventId: number;
  carIds: number[];
  /** Texto no topo do visualizador, ex.: "#28 David Karatas". */
  caption?: string;
};

export function PhotoGrid({ photos }: { photos: GridPhoto[] }) {
  const cart = useCart();
  const { t, lang } = useI18n();
  const [open, setOpen] = useState<number | null>(null);

  const close = useCallback(() => setOpen(null), []);
  const step = useCallback(
    (dir: 1 | -1) => setOpen((i) => (i == null ? i : (i + dir + photos.length) % photos.length)),
    [photos.length],
  );

  useEffect(() => {
    if (open == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, close, step]);

  // Uma foto já incluída num pack (do evento ou de um dos carros) não se compra à parte.
  const covered = (p: GridPhoto) =>
    cart.has({ type: "pack", eventId: p.eventId }) || p.carIds.some((carId) => cart.has({ type: "carpack", carId }));
  const current = open != null ? photos[open] : null;

  return (
    <>
      <div className="photo-grid">
        {photos.map((p, i) => {
          const item: CartItem = { type: "photo", photoId: p.id };
          const inPack = covered(p);
          const inCart = inPack || cart.has(item);
          return (
            <div key={p.id} className="photo" onClick={() => setOpen(i)} onContextMenu={(e) => e.preventDefault()}>
              <img src={thumbUrl(p.key)} alt={p.caption ?? `#${p.id}`} loading="lazy" draggable={false} />
              <button
                type="button"
                className={`add ${inCart ? "on" : ""}`}
                disabled={inPack}
                aria-label={inCart ? t("photo.remove") : t("photo.add")}
                title={inPack ? t("photo.inPack") : inCart ? t("photo.remove") : t("photo.add")}
                onClick={(e) => {
                  e.stopPropagation();
                  cart.toggle(item);
                }}
              >
                {inCart ? "✓" : "+"}
              </button>
            </div>
          );
        })}
      </div>

      {current && (
        <div className="lightbox" role="dialog" aria-modal="true" onClick={close}>
          <div className="lb-top" onClick={(e) => e.stopPropagation()}>
            <span>{current.caption ? `${current.caption} · ` : ""}#{current.id}</span>
            <button className="icon-btn" onClick={close} aria-label={t("photo.close")}>
              ×
            </button>
          </div>
          <div className="lb-img">
            <img
              src={previewUrl(current.key)}
              alt={current.caption ?? `#${current.id}`}
              draggable={false}
              onClick={(e) => e.stopPropagation()}
              onContextMenu={(e) => e.preventDefault()}
            />
            {photos.length > 1 && (
              <>
                <button className="lb-nav prev" aria-label={t("photo.prev")} onClick={(e) => (e.stopPropagation(), step(-1))}>
                  ‹
                </button>
                <button className="lb-nav next" aria-label={t("photo.next")} onClick={(e) => (e.stopPropagation(), step(1))}>
                  ›
                </button>
              </>
            )}
          </div>
          <div className="lb-bottom" onClick={(e) => e.stopPropagation()}>
            <span>
              {open! + 1} / {photos.length}
            </span>
            {covered(current) ? (
              <span>{t("photo.inPack")}</span>
            ) : (
              <button
                className={`btn ${cart.has({ type: "photo", photoId: current.id }) ? "in-cart" : ""}`}
                onClick={() => cart.toggle({ type: "photo", photoId: current.id })}
              >
                {cart.has({ type: "photo", photoId: current.id })
                  ? t("event.inCart")
                  : t("photo.addPrice", { price: formatEUR(current.priceCents, lang) })}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/** Botão de pack (piloto ou evento). Um pack de evento torna redundante o pack de piloto do mesmo evento. */
export function PackButton({ item, priceCents, eventId }: { item: CartItem; priceCents: number; eventId: number }) {
  const cart = useCart();
  const { t, lang } = useI18n();
  const inCart = cart.has(item);
  const coveredByEvent = item.type === "carpack" && cart.has({ type: "pack", eventId });
  if (coveredByEvent) return <span className="success">{t("photo.inPack")}</span>;
  return (
    <button className={`btn block ${inCart ? "in-cart" : "accent"}`} onClick={() => cart.toggle(item)}>
      {inCart ? t("event.inCart") : t("event.buyAll", { price: formatEUR(priceCents, lang) })}
    </button>
  );
}
