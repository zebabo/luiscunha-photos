import type { Metadata } from "next";
import { paymentProvider } from "@/lib/config";
import { CartView } from "./CartView";

export const metadata: Metadata = { title: "Carrinho", robots: { index: false } };

export default function CartPage() {
  const provider = paymentProvider();
  const methods = provider === "stripe" ? ["MB Way", "Multibanco", "Cartão", "Apple Pay", "Google Pay"] : ["Modo demonstração"];
  return (
    <div className="container">
      <h1 style={{ marginTop: 40 }}>Carrinho</h1>
      <CartView paymentsLabel={methods} />
    </div>
  );
}
