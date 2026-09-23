"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { cartItemKey, type CartItem } from "@/lib/cart-types";

const STORAGE_KEY = "galeria.cart.v1";

type CartContextValue = {
  items: CartItem[];
  count: number;
  ready: boolean;
  has: (item: CartItem) => boolean;
  add: (item: CartItem) => void;
  remove: (item: CartItem) => void;
  toggle: (item: CartItem) => void;
  replace: (items: CartItem[]) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function load(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setItems(load());
    setReady(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setItems(load());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const persist = useCallback((next: CartItem[]) => {
    setItems(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* armazenamento indisponível: o carrinho fica só em memória */
    }
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const keys = new Set(items.map(cartItemKey));
    const has = (item: CartItem) => keys.has(cartItemKey(item));
    const add = (item: CartItem) => {
      if (has(item)) return;
      // Se houver pack e fotos avulsas do mesmo evento, o servidor cobra só o pack.
      persist([...items, item]);
    };
    const remove = (item: CartItem) => persist(items.filter((i) => cartItemKey(i) !== cartItemKey(item)));
    return {
      items,
      count: items.length,
      ready,
      has,
      add,
      remove,
      toggle: (item) => (has(item) ? remove(item) : add(item)),
      replace: persist,
      clear: () => persist([]),
    };
  }, [items, ready, persist]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart fora do CartProvider");
  return ctx;
}

export function CartLink({ label }: { label: string }) {
  const { count, ready } = useCart();
  return (
    <a href="/carrinho" className="cart-link" aria-label={`${label} (${count})`}>
      {label} {ready && count > 0 && <span className="badge">{count}</span>}
    </a>
  );
}
