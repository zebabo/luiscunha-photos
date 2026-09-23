"use client";

import { useEffect } from "react";
import { useCart } from "@/components/CartProvider";

export function ClearCart() {
  const { ready, count, clear } = useCart();
  useEffect(() => {
    if (ready && count > 0) clear();
  }, [ready, count, clear]);
  return null;
}
