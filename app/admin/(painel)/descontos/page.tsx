import { listAllEvents, listDiscounts } from "@/lib/repo";
import { formatDate, formatEUR } from "@/lib/format";
import { createDiscount, deleteDiscount, toggleDiscount } from "../../actions";
import { SimpleActionForm } from "@/components/admin/EventForm";
import { ConfirmButton } from "@/components/admin/ConfirmButton";

export default function AdminDiscounts() {
  const discounts = listDiscounts();
  const events = listAllEvents();
  return (
    <div className="stack">
      <section className="card">
        <h2 style={{ marginTop: 0 }}>Novo código de desconto</h2>
        <SimpleActionForm action={createDiscount} submitLabel="Criar código">
          <div className="row">
            <div className="field">
              <label htmlFor="code">Código *</label>
              <input id="code" name="code" required placeholder="EX.: TRAIL10" style={{ textTransform: "uppercase" }} />
            </div>
            <div className="field">
              <label htmlFor="kind">Tipo</label>
              <select id="kind" name="kind">
                <option value="percent">Percentagem (%)</option>
                <option value="fixed">Valor fixo (€)</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="value">Valor *</label>
              <input id="value" name="value" required inputMode="decimal" placeholder="10" />
            </div>
          </div>
          <div className="row">
            <div className="field">
              <label htmlFor="event_id">Aplica-se a</label>
              <select id="event_id" name="event_id">
                <option value="">Todos os eventos</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>{e.title}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="max_uses">Máximo de utilizações</label>
              <input id="max_uses" name="max_uses" type="number" min={1} placeholder="ilimitado" />
            </div>
            <div className="field">
              <label htmlFor="expires_at">Válido até</label>
              <input id="expires_at" name="expires_at" type="date" />
            </div>
          </div>
        </SimpleActionForm>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Códigos</h2>
        {discounts.length === 0 ? (
          <p className="muted">Ainda não há códigos.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Código</th><th>Desconto</th><th>Evento</th><th>Usos</th><th>Validade</th><th>Estado</th><th /></tr>
              </thead>
              <tbody>
                {discounts.map((d) => (
                  <tr key={d.id}>
                    <td><strong>{d.code}</strong></td>
                    <td>{d.kind === "percent" ? `${d.value}%` : formatEUR(d.value)}</td>
                    <td>{d.event_title ?? "Todos"}</td>
                    <td>{d.used_count}{d.max_uses != null && ` / ${d.max_uses}`}</td>
                    <td>{d.expires_at ? formatDate(d.expires_at.slice(0, 10)) : "—"}</td>
                    <td>
                      <form action={toggleDiscount.bind(null, d.id)}>
                        <button className={`pill ${d.active ? "paid" : "draft"}`} style={{ border: 0, cursor: "pointer" }}>
                          {d.active ? "Ativo" : "Inativo"}
                        </button>
                      </form>
                    </td>
                    <td>
                      <ConfirmButton action={deleteDiscount.bind(null, d.id)} message={`Apagar o código ${d.code}?`} className="link-btn">
                        Apagar
                      </ConfirmButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
