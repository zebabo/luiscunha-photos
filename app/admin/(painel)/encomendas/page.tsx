import Link from "next/link";
import { countOrders, listOrders, type OrderFilter } from "@/lib/repo";
import { formatDateTime, formatEUR, statusLabel } from "@/lib/format";
import { adminMarkPaid, deleteOrder, deleteUnpaidOrders, resendEmail, setOrderArchived } from "../../actions";
import { ConfirmButton } from "@/components/admin/ConfirmButton";

const PAGE_SIZE = 50;
const TABS: { key: OrderFilter; label: string }[] = [
  { key: "ativas", label: "Todas" },
  { key: "pagas", label: "Pagas" },
  { key: "pendentes", label: "Não pagas" },
  { key: "arquivadas", label: "Arquivadas" },
];
const DAY = 86400_000;

function canDelete(o: { status: string; created_at: string }) {
  if (o.status === "failed" || o.status === "expired") return true;
  if (o.status !== "pending") return false;
  return Date.now() - new Date(`${o.created_at.replace(" ", "T")}Z`).getTime() > 14 * DAY;
}

type Props = { searchParams: Promise<{ ver?: string; p?: string }> };

export default async function AdminOrders({ searchParams }: Props) {
  const sp = await searchParams;
  const filter: OrderFilter = TABS.some((t) => t.key === sp.ver) ? (sp.ver as OrderFilter) : "ativas";
  const counts = countOrders();
  const pages = Math.max(1, Math.ceil(counts[filter] / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Number(sp.p) || 1));
  const orders = listOrders({ filter, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE });
  const deletable = orders.filter(canDelete).length;

  return (
    <section className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ margin: 0 }}>Encomendas</h2>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {TABS.map((t) => (
            <Link key={t.key} href={`/admin/encomendas?ver=${t.key}`} className={`btn small ${t.key === filter ? "" : "secondary"}`}>
              {t.label} ({counts[t.key]})
            </Link>
          ))}
        </div>
      </div>
      <p className="hint">
        As encomendas pagas não se apagam (são o registo das vendas e dão acesso às fotos ao cliente): arquiva-as para
        saírem da lista. Falhadas, expiradas e pendentes há mais de 14 dias podem ser apagadas.
      </p>
      {filter === "pendentes" && deletable > 0 && (
        <ConfirmButton
          action={deleteUnpaidOrders}
          message="Apagar todas as encomendas falhadas, expiradas e pendentes há mais de 14 dias?"
          className="btn danger small"
        >
          Apagar todas as não pagas antigas
        </ConfirmButton>
      )}

      {orders.length === 0 ? (
        <p className="muted" style={{ marginTop: 16 }}>Nada para mostrar.</p>
      ) : (
        <div className="table-wrap" style={{ marginTop: 12 }}>
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
                  <td>
                    <div style={{ display: "flex", gap: 12, whiteSpace: "nowrap" }}>
                      {o.status === "paid" && (
                        <>
                          <Link className="link-btn" href={`/encomenda/${o.download_token}`} target="_blank">Downloads</Link>
                          <ConfirmButton action={resendEmail.bind(null, o.id)} message={`Reenviar o email para ${o.email} (renova o prazo)?`} className="link-btn">
                            Reenviar
                          </ConfirmButton>
                        </>
                      )}
                      {o.status === "pending" && (
                        <ConfirmButton
                          action={adminMarkPaid.bind(null, o.id)}
                          message="Marcar como paga? Use apenas se confirmou o pagamento por outra via (ex.: transferência)."
                          className="link-btn"
                        >
                          Marcar paga
                        </ConfirmButton>
                      )}
                      {o.archived ? (
                        <ConfirmButton action={setOrderArchived.bind(null, o.id, false)} message="Voltar a mostrar esta encomenda na lista?" className="link-btn">
                          Desarquivar
                        </ConfirmButton>
                      ) : (
                        <ConfirmButton action={setOrderArchived.bind(null, o.id, true)} message={`Arquivar a encomenda n.º ${o.id}? Continua guardada e o cliente mantém o acesso às fotos.`} className="link-btn">
                          Arquivar
                        </ConfirmButton>
                      )}
                      {canDelete(o) && (
                        <ConfirmButton action={deleteOrder.bind(null, o.id)} message={`Apagar definitivamente a encomenda n.º ${o.id}?`} className="link-btn" >
                          Apagar
                        </ConfirmButton>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <Link key={n} href={`/admin/encomendas?ver=${filter}&p=${n}`} className={`btn small ${n === page ? "" : "secondary"}`}>
              {n}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
