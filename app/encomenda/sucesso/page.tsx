import type { Metadata } from "next";
import Link from "next/link";
import { getOrderByPublicId } from "@/lib/repo";
import { ClearCart } from "./ClearCart";

export const metadata: Metadata = { title: "Obrigado", robots: { index: false } };

export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams;
  const order = ref ? getOrderByPublicId(ref) : undefined;

  return (
    <div className="container" style={{ maxWidth: 640, paddingTop: 56, textAlign: "center" }}>
      <ClearCart />
      <h1>Obrigado pela sua compra!</h1>
      {order?.status === "paid" ? (
        <>
          <p className="muted">
            O pagamento foi confirmado. Enviámos também o link para <strong>{order.email}</strong>.
          </p>
          <Link className="btn" href={`/encomenda/${order.download_token}`}>
            Descarregar fotografias
          </Link>
        </>
      ) : (
        <>
          <p className="muted">
            Estamos a aguardar a confirmação do pagamento. Assim que for confirmado recebe um email
            {order ? (
              <>
                {" "}
                em <strong>{order.email}</strong>
              </>
            ) : null}{" "}
            com o link para descarregar as fotografias.
          </p>
          <p className="muted">
            Se pagou por <strong>Multibanco</strong>, a confirmação chega normalmente poucos minutos depois de efetuar o
            pagamento da referência.
          </p>
          {order && (
            <p>
              <Link href={`/encomenda/sucesso?ref=${order.public_id}`} className="btn secondary">
                Atualizar estado
              </Link>
            </p>
          )}
        </>
      )}
    </div>
  );
}
