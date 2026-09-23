import Link from "next/link";
import { notFound } from "next/navigation";
import { getEvent, listEventPhotos } from "@/lib/repo";
import { centsToInput } from "@/lib/format";
import { thumbUrl } from "@/lib/media";
import { bulkBibs, deleteEvent, deletePhoto, savePhotoBibs, setCover, updateEvent } from "../../../actions";
import { EventForm, SimpleActionForm } from "@/components/admin/EventForm";
import { Uploader } from "@/components/admin/Uploader";
import { ConfirmButton } from "@/components/admin/ConfirmButton";

const PAGE_SIZE = 120;

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ p?: string; filtro?: string }> };

export default async function AdminEvent({ params, searchParams }: Props) {
  const { id } = await params;
  const { p, filtro } = await searchParams;
  const event = getEvent(Number(id));
  if (!event) notFound();

  const all = listEventPhotos(event.id);
  const untagged = all.filter((ph) => ph.bibs.length === 0).length;
  const filtered = filtro === "sem-dorsal" ? all.filter((ph) => ph.bibs.length === 0) : all;
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Number(p) || 1));
  const photos = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const qs = (n: number) => `?p=${n}${filtro ? `&filtro=${filtro}` : ""}`;

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
            price_pack: centsToInput(event.price_pack_cents),
            published: !!event.published,
          }}
        />
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Carregar fotografias</h2>
        <Uploader eventId={event.id} />
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Dorsais em massa</h2>
        <p className="hint">
          Uma linha por fotografia: <code>nome-do-ficheiro: dorsais</code>. Útil para colar uma folha de cálculo.
          Ex.: <code>IMG_0042: 123, 456</code>
        </p>
        <SimpleActionForm action={bulkBibs.bind(null, event.id)} submitLabel="Aplicar dorsais">
          <div className="field">
            <textarea name="mapping" placeholder={"IMG_0042: 123, 456\nIMG_0043: 789"} />
          </div>
        </SimpleActionForm>
      </section>

      <section>
        <div className="toolbar" style={{ marginTop: 0 }}>
          <h2 style={{ margin: 0 }}>
            Fotografias ({all.length}){" "}
            <span className="muted" style={{ fontSize: "0.95rem" }}>· {untagged} sem dorsal</span>
          </h2>
          <div style={{ display: "flex", gap: 8 }}>
            <Link className="btn secondary small" href={`/admin/eventos/${event.id}`}>Todas</Link>
            <Link className="btn secondary small" href={`/admin/eventos/${event.id}?filtro=sem-dorsal`}>Sem dorsal</Link>
          </div>
        </div>
        <div className="admin-photos">
          {photos.map((ph) => (
            <div key={ph.id} className="admin-photo">
              <img src={thumbUrl(ph.file_key)} alt="" loading="lazy" />
              <div className="body">
                <span className="muted" title={ph.original_name}>
                  #{ph.id} · {ph.original_name.slice(0, 22)}
                  {event.cover_photo_id === ph.id && " · capa"}
                </span>
                <form action={savePhotoBibs.bind(null, ph.id)}>
                  <input name="bibs" defaultValue={ph.bibs.join(", ")} placeholder="Dorsais" aria-label="Dorsais" />
                  <button className="btn secondary small">OK</button>
                </form>
                <div className="actions">
                  <form action={setCover.bind(null, event.id, ph.id)}>
                    <button className="link-btn">Usar como capa</button>
                  </form>
                  <ConfirmButton action={deletePhoto.bind(null, ph.id)} message="Apagar esta fotografia?" className="link-btn">
                    Apagar
                  </ConfirmButton>
                </div>
              </div>
            </div>
          ))}
        </div>
        {pages > 1 && (
          <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
            {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
              <Link key={n} href={`/admin/eventos/${event.id}${qs(n)}`} className={`btn small ${n === page ? "" : "secondary"}`}>
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
