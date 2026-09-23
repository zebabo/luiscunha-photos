import Link from "next/link";
import { listOrders, salesStats } from "@/lib/repo";
import { formatDateTime, formatEUR, statusLabel } from "@/lib/format";

export default function AdminHome() {
  const stats = salesStats();
  const recent = listOrders({ limit: 8 });
  return (
    <div className="stack">
      <div className="stats">
        <div className="card stat">
          <div className="value">{formatEUR(stats.last30.cents)}</div>
          <div className="label">Vendas nos últimos 30 dias ({stats.last30.n} encomendas)</div>
        </div>
        <div className="card stat">
          <div className="value">{formatEUR(stats.total.cents)}</div>
          <div className="label">Total de vendas ({stats.total.n} encomendas)</div>
        </div>
        <div className="card stat">
          <div className="value">{stats.total.n ? formatEUR(Math.round(stats.total.cents / stats.total.n)) : "—"}</div>
          <div className="label">Valor médio por encomenda</div>
        </div>
      </div>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Eventos que mais vendem</h2>
        {stats.byEvent.length === 0 ? (
          <p className="muted">Ainda sem vendas.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Evento</th><th>Encomendas</th><th>Valor (antes de descontos)</th></tr>
              </thead>
              <tbody>
                {stats.byEvent.map((e) => (
                  <tr key={e.title}><td>{e.title}</td><td>{e.orders}</td><td>{formatEUR(e.cents)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Últimas encomendas</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>N.º</th><th>Data</th><th>Cliente</th><th>Total</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {recent.map((o) => (
                <tr key={o.id}>
                  <td>{o.id}</td>
                  <td>{formatDateTime(o.created_at)}</td>
                  <td>{o.email}</td>
                  <td>{formatEUR(o.total_cents)}</td>
                  <td><span className={`pill ${o.status}`}>{statusLabel(o.status)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p><Link href="/admin/encomendas">Ver todas →</Link></p>
      </section>
    </div>
  );
}
