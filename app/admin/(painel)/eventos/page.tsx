import Link from "next/link";
import { listAllEvents } from "@/lib/repo";
import { formatDate, formatEUR } from "@/lib/format";
import { createEvent } from "../../actions";
import { EventForm } from "@/components/admin/EventForm";

export default function AdminEvents() {
  const events = listAllEvents();
  return (
    <div className="stack">
      <section className="card">
        <h2 style={{ marginTop: 0 }}>Eventos</h2>
        {events.length === 0 ? (
          <p className="muted">Ainda não criou nenhum evento.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Evento</th><th>Data</th><th>Carros</th><th>Fotos</th><th>Foto</th><th>Pack piloto</th><th>Pack evento</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id}>
                    <td><Link href={`/admin/eventos/${e.id}`}><strong>{e.title}</strong></Link></td>
                    <td>{formatDate(e.event_date)}</td>
                    <td>{e.car_count}</td>
                    <td>{e.photo_count}</td>
                    <td>{formatEUR(e.price_photo_cents)}</td>
                    <td>{e.price_car_pack_cents != null ? formatEUR(e.price_car_pack_cents) : "—"}</td>
                    <td>{e.price_pack_cents != null ? formatEUR(e.price_pack_cents) : "—"}</td>
                    <td>{e.published ? <span className="pill paid">Publicado</span> : <span className="pill draft">Rascunho</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="card">
        <h2 style={{ marginTop: 0 }}>Novo evento</h2>
        <EventForm action={createEvent} submitLabel="Criar evento" />
      </section>
    </div>
  );
}
