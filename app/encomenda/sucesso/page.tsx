import type { Metadata } from "next";
import Link from "next/link";
import { getOrderByPublicId } from "@/lib/repo";
import { getT } from "@/lib/i18n-server";
import { ClearCart } from "./ClearCart";

export const metadata: Metadata = { robots: { index: false } };

export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams;
  const order = ref ? getOrderByPublicId(ref) : undefined;
  const { t } = await getT();

  return (
    <div className="container" style={{ maxWidth: 640, paddingTop: 56, textAlign: "center" }}>
      <ClearCart />
      <h1>{t("success.title")}</h1>
      {order?.status === "paid" ? (
        <>
          <p className="muted">{t("success.paid", { email: order.email })}</p>
          <Link className="btn accent" href={`/encomenda/${order.download_token}`}>
            {t("success.download")}
          </Link>
        </>
      ) : (
        <>
          <p className="muted">{t("success.waiting")}</p>
          <p className="muted">{t("success.multibanco")}</p>
          {order && (
            <p>
              <Link href={`/encomenda/sucesso?ref=${order.public_id}`} className="btn secondary">
                {t("success.refresh")}
              </Link>
            </p>
          )}
        </>
      )}
    </div>
  );
}
