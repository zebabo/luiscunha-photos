import Link from "next/link";
import { notFound } from "next/navigation";
import { getEvent, listEventCars, listEventPhotos } from "@/lib/repo";
import { centsToInput } from "@/lib/format";
import { thumbUrl } from "@/lib/media";
import { addCar, bulkPhotos, deleteCar, deleteEvent, importCars, updateCar, updateEvent } from "../../../actions";
import { EventForm, SimpleActionForm } from "@/components/admin/EventForm";
import { Uploader } from "@/components/admin/Uploader";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { BulkPhotoForm } from "@/components/admin/BulkPhotoForm";

const PAGE_SIZE = 120;

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ p?: string; carro?: string }> };

export default async function AdminEvent({ params, searchParams }: Props) {
  const { id } = await params;
  const { p, carro } = await searchParams;
  const event = getEvent(Number(id));
  if (!event) notFound();

  const cars = listEventCars(event.id);
  const carById = new Map(cars.map((c) => [c.id, c]));
  const all = listEventPhotos(event.id);
  const untagged = all.filter((ph) => ph.car_ids.length === 0).length;
  const filtered =
    carro === "sem" ? all.filter((ph) => ph.car_ids.length === 0) : carro ? all.filter((ph) => ph.car_ids.includes(Number(carro))) : all;
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Number(p) || 1));
  const photos = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const base = `/admin/eventos/${event.id}`;
  const qs = (n: number) => `?p=${n}${carro ? `&carro=${carro}` : ""}`;
  const carOptions = cars.map((c) => ({ id: c.id, number: c.number, driver: c.driver }));

  return (
    <div className="stack">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ margin: 0 }}>{event.title}</h1>
        {event.published ? (
          <Link className="btn secondary small" href={`/eventos/${event.slug}`} target="_blank">
            Ver no site ↗
          </Link>
        ) : (
          <span className="pill draft">Rascunho — não visível no site</span>
        )}
      </div>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Detalhes e preços</h2>
        <EventForm
          action={updateEvent.bind(null, event.id)}
          submitLabel="Guardar alterações"
          showPublish
          values={{
            title: event.title,
            slug: event.slug,
            description: event.description,
            event_date: event.event_date,
            location: event.location,
            price_photo: centsToInput(event.price_photo_cents),
            price_car_pack: centsToInput(event.price_car_pack_cents),
            price_pack: centsToInput(event.price_pack_cents),
            published: !!event.published,
          }}
        />
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>1. Carros e pilotos ({cars.length})</h2>
        <p className="hint">
          Adiciona os carros do evento. Só aparecem no site os carros que já têm fotos.
        </p>
        {cars.length > 0 && (
          <div className="table-wrap" style={{ marginBottom: 20 }}>
            <table>
              <thead>
                <tr><th>N.º</th><th>Piloto</th><th>Equipa</th><th>Fotos</th><th /></tr>
              </thead>
              <tbody>
                {cars.map((c) => (
                  <tr key={c.id} className="car-row">
                    <td colSpan={3}>
                      <form action={updateCar.bind(null, c.id, event.id)} style={{ display: "grid", gridTemplateColumns: "70px 1fr 1fr auto", gap: 6 }}>
                        <input name="number" defaultValue={c.number} aria-label="Número" />
                        <input name="driver" defaultValue={c.driver} aria-label="Piloto" />
                        <input name="team" defaultValue={c.team} aria-label="Equipa" />
                        <button className="btn secondary small">Guardar</button>
                      </form>
                    </td>
                    <td>
                      <Link href={`${base}?carro=${c.id}`}>{c.photo_count}</Link>
                    </td>
                    <td>
                      <ConfirmButton
                        action={deleteCar.bind(null, c.id, event.id)}
                        message={`Remover o carro #${c.number}? As fotos ficam no evento, só deixam de estar associadas.`}
                        className="link-btn"
                      >
                        Remover
                      </ConfirmButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="row" style={{ alignItems: "flex-start" }}>
          <div>
            <h3>Adicionar carro</h3>
            <SimpleActionForm action={addCar.bind(null, event.id)} submitLabel="Adicionar">
              <div className="row">
                <div className="field" style={{ flex: "0 0 90px" }}>
                  <label htmlFor="number">N.º *</label>
                  <input id="number" name="number" required placeholder="28" />
                </div>
                <div className="field">
                  <label htmlFor="driver">Piloto</label>
                  <input id="driver" name="driver" placeholder="Nome do piloto" />
                </div>
                <div className="field">
                  <label htmlFor="team">Equipa</label>
                  <input id="team" name="team" />
                </div>
              </div>
            </SimpleActionForm>
          </div>
          <div>
            <h3>Colar lista de inscritos</h3>
            <SimpleActionForm action={importCars.bind(null, event.id)} submitLabel="Importar lista">
              <div className="field">
                <textarea name="list" placeholder={"28; David Karatas; KRT Racing\n111; João Silva; Team Drift"} />
                <small>Uma linha por carro: número; piloto; equipa. Pode colar diretamente de uma folha de cálculo.</small>
              </div>
            </SimpleActionForm>
          </div>
        </div>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>2. Carregar fotografias</h2>
        <Uploader eventId={event.id} cars={carOptions} />
      </section>

      <section>
        <div className="toolbar" style={{ marginTop: 0 }}>
          <h2 style={{ margin: 0 }}>
            3. Fotografias ({all.length}){" "}
            <span className="muted" style={{ fontSize: "0.95rem" }}>· {untagged} sem carro</span>
          </h2>
          <form style={{ display: "flex", gap: 8 }}>
            <select name="carro" defaultValue={carro ?? ""} aria-label="Filtrar">
              <option value="">Todas</option>
              <option value="sem">Sem carro ({untagged})</option>
              {cars.map((c) => (
                <option key={c.id} value={c.id}>
                  #{c.number} {c.driver} ({c.photo_count})
                </option>
              ))}
            </select>
            <button className="btn secondary small">Filtrar</button>
          </form>
        </div>
        <BulkPhotoForm action={bulkPhotos.bind(null, event.id)} cars={carOptions}>
          <div className="admin-photos">
            {photos.map((ph) => (
              <div key={ph.id} className="admin-photo">
                <label className="cover">
                  <img src={thumbUrl(ph.file_key)} alt="" loading="lazy" />
                  <input type="checkbox" name="ids" value={ph.id} className="pick" aria-label={`Selecionar ${ph.id}`} />
                </label>
                <div className="body">
                  <div>
                    {ph.car_ids.map((cid) => (
                      <span key={cid} className="tag">
                        #{carById.get(cid)?.number}
                      </span>
                    ))}
                    {event.cover_photo_id === ph.id && <span className="pill draft">capa</span>}
                  </div>
                  <span className="muted" title={ph.original_name}>
                    #{ph.id} · {ph.original_name.slice(0, 24)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </BulkPhotoForm>
        {pages > 1 && (
          <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
            {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
              <Link key={n} href={`${base}${qs(n)}`} className={`btn small ${n === page ? "" : "secondary"}`}>
                {n}
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Zona perigosa</h2>
        <ConfirmButton
          action={deleteEvent.bind(null, event.id)}
          message={`Apagar o evento "${event.title}" e TODAS as fotografias? Esta ação não pode ser desfeita.`}
          className="btn danger"
        >
          Apagar evento
        </ConfirmButton>
      </section>
    </div>
  );
}
