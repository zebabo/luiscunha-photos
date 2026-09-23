import type { Metadata } from "next";
import { paymentProvider } from "@/lib/config";
import { getT } from "@/lib/i18n-server";
import { CartView } from "./CartView";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("cart.title"), robots: { index: false } };
}

export default async function CartPage() {
  const { t } = await getT();
  return (
    <div className="container">
      <h1 style={{ marginTop: 40 }}>{t("cart.title")}</h1>
      <CartView demo={paymentProvider() !== "stripe"} />
    </div>
  );
}
