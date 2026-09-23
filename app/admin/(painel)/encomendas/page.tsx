import Link from "next/link";
import { listOrders } from "@/lib/repo";
import { formatDateTime, formatEUR, statusLabel } from "@/lib/format";
import { adminMarkPaid, resendEmail } from "../../actions";
import { ConfirmButton } from "@/components/admin/ConfirmButton";

export default function AdminOrders() {
  const orders = listOrders(500);
  return (
    <section className="card">
      <h2 style={{ marginTop: 0 }}>Encomendas</h2>
      {orders.length === 0 ? (
        <p className="muted">Ainda não há encomendas.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>N.º</th><th>Data</th><th>Cliente</th><th>NIF</th><th>Itens</th><th>Desconto</th><th>Total</th><th>Pagamento</th><th>Estado</th><th />
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{o.id}</td>
                  <td>{formatDateTime(o.created_at)}</td>
                  <td>
                    {o.name && <div>{o.name}</div>}
                    <a href={`mailto:${o.email}`} className="muted">{o.email}</a>
                  </td>
                  <td>{o.nif || "—"}</td>
                  <td>{o.item_count}</td>
                  <td>{o.discount_cents > 0 ? `${formatEUR(o.discount_cents)} (${o.discount_code})` : "—"}</td>
                  <td><strong>{formatEUR(o.total_cents)}</strong></td>
                  <td>{o.provider}</td>
                  <td><span className={`pill ${o.status}`}>{statusLabel(o.status)}</span></td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {o.status === "paid" ? (
                      <div style={{ display: "flex", gap: 10 }}>
                        <Link className="link-btn" href={`/encomenda/${o.download_token}`} target="_blank">Downloads</Link>
                        <ConfirmButton action={resendEmail.bind(null, o.id)} message={`Reenviar o email para ${o.email} (renova o prazo)?`} className="link-btn">
                          Reenviar
                        </ConfirmButton>
                      </div>
                    ) : (
                      <ConfirmButton
                        action={adminMarkPaid.bind(null, o.id)}
                        message="Marcar como paga? Use apenas se confirmou o pagamento por outra via (ex.: transferência)."
                        className="link-btn"
                      >
                        Marcar paga
                      </ConfirmButton>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
