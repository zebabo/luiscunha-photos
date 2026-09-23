import { notFound, redirect } from "next/navigation";
import { config } from "@/lib/config";
import { getOrderByPublicId, getOrderItems } from "@/lib/repo";
import { markPaid } from "@/lib/orders";
import { formatEUR } from "@/lib/format";

// Página de pagamento simulado, usada apenas enquanto o Stripe não está configurado.
export default async function DemoCheckout({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const order = getOrderByPublicId(ref);
  if (!order || order.provider !== "demo" || !config.allowDemoPayments) notFound();
  if (order.status === "paid") redirect(`/encomenda/${order.download_token}`);
  const items = getOrderItems(order.id);

  async function pay() {
    "use server";
    const o = getOrderByPublicId(ref);
    if (!o || o.provider !== "demo" || !config.allowDemoPayments) return;
    await markPaid(o.id, `demo-${Date.now()}`);
    redirect(`/encomenda/sucesso?ref=${ref}`);
  }

  return (
    <div className="container" style={{ maxWidth: 560, paddingTop: 48 }}>
      <div className="notice">
        <strong>Modo demonstração.</strong> Nenhum pagamento real é efetuado. Configure o Stripe para aceitar MB Way,
        Multibanco e cartão.
      </div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Pagamento</h2>
        {items.map((i) => (
          <div key={i.id} className="summary line" style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{i.label}</span>
            <span>{formatEUR(i.price_cents)}</span>
          </div>
        ))}
        {order.discount_cents > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Desconto ({order.discount_code})</span>
            <span>−{formatEUR(order.discount_cents)}</span>
          </div>
        )}
        <p style={{ fontSize: "1.3rem", fontWeight: 600 }}>Total: {formatEUR(order.total_cents)}</p>
        <form action={pay}>
          <button className="btn block" type="submit">
            Simular pagamento com sucesso
          </button>
        </form>
      </div>
    </div>
  );
}
