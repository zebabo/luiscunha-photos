"use client";

import { useCallback, useEffect, useState } from "react";
import { useCart } from "./CartProvider";
import { previewUrl, thumbUrl } from "@/lib/media";
import { formatEUR } from "@/lib/format";

export type GridPhoto = {
  id: number;
  key: string;
  bibs: string[];
  priceCents: number;
  eventId: number;
  eventTitle?: string;
  inPack?: boolean;
};

export function PhotoGrid({ photos, highlightBib }: { photos: GridPhoto[]; highlightBib?: string }) {
  const cart = useCart();
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

  const packInCart = (eventId: number) => cart.has({ type: "pack", eventId });
  const current = open != null ? photos[open] : null;

  return (
    <>
      <div className="photo-grid">
        {photos.map((p, i) => {
          const item = { type: "photo" as const, photoId: p.id };
          const covered = packInCart(p.eventId);
          const inCart = covered || cart.has(item);
          return (
            <div key={p.id} className="photo" onClick={() => setOpen(i)} onContextMenu={(e) => e.preventDefault()}>
              <img src={thumbUrl(p.key)} alt={`Fotografia ${p.id}`} loading="lazy" draggable={false} />
              {highlightBib && <span className="bib-tag">#{highlightBib}</span>}
              <button
                type="button"
                className={`add ${inCart ? "on" : ""}`}
                disabled={covered}
                aria-label={inCart ? "Remover do carrinho" : "Adicionar ao carrinho"}
                title={covered ? "Incluída no pack" : inCart ? "Remover do carrinho" : "Adicionar ao carrinho"}
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
            <span>
              {current.eventTitle ? `${current.eventTitle} · ` : ""}Foto #{current.id}
              {current.bibs.length > 0 && ` · Dorsal ${current.bibs.join(", ")}`}
            </span>
            <button className="icon-btn" onClick={close} aria-label="Fechar">
              ×
            </button>
          </div>
          <div className="lb-img">
            <img
              src={previewUrl(current.key)}
              alt={`Fotografia ${current.id}`}
              draggable={false}
              onClick={(e) => e.stopPropagation()}
              onContextMenu={(e) => e.preventDefault()}
            />
            {photos.length > 1 && (
              <>
                <button className="lb-nav prev" aria-label="Anterior" onClick={(e) => (e.stopPropagation(), step(-1))}>
                  ‹
                </button>
                <button className="lb-nav next" aria-label="Seguinte" onClick={(e) => (e.stopPropagation(), step(1))}>
                  ›
                </button>
              </>
            )}
          </div>
          <div className="lb-bottom" onClick={(e) => e.stopPropagation()}>
            <span>
              {open! + 1} / {photos.length}
            </span>
            {packInCart(current.eventId) ? (
              <span>Incluída no pack do evento ✓</span>
            ) : (
              <button
                className={`btn ${cart.has({ type: "photo", photoId: current.id }) ? "in-cart" : ""}`}
                onClick={() => cart.toggle({ type: "photo", photoId: current.id })}
              >
                {cart.has({ type: "photo", photoId: current.id })
                  ? "✓ No carrinho"
                  : `Adicionar · ${formatEUR(current.priceCents)}`}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export function PackButton({ eventId, priceCents }: { eventId: number; priceCents: number }) {
  const cart = useCart();
  const item = { type: "pack" as const, eventId };
  const inCart = cart.has(item);
  return (
    <button className={`btn block ${inCart ? "in-cart" : ""}`} onClick={() => cart.toggle(item)}>
      {inCart ? "✓ Pack no carrinho" : `Comprar todas · ${formatEUR(priceCents)}`}
    </button>
  );
}
