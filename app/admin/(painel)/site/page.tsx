import { getSettings } from "@/lib/settings";
import { listPortfolio, listUpcoming } from "@/lib/repo";
import { siteImageUrl } from "@/lib/media";
import { addPortfolio, addUpcoming, deletePortfolio, deleteUpcoming, saveSettings } from "../../actions";
import { SimpleActionForm } from "@/components/admin/EventForm";
import { ConfirmButton } from "@/components/admin/ConfirmButton";

function ImageField({ name, label, current, hint }: { name: string; label: string; current: string; hint: string }) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      {current && <img src={siteImageUrl(current)} alt="" style={{ maxHeight: 90, marginBottom: 8, background: "#000" }} />}
      <input id={name} name={name} type="file" accept="image/jpeg,image/png,image/webp" />
      <small>{hint}</small>
      {current && (
        <label className="checkbox" style={{ marginTop: 6 }}>
          <input type="checkbox" name={`remove_${name}`} /> <span>Remover</span>
        </label>
      )}
    </div>
  );
}

export default function AdminSite() {
  const s = getSettings();
  const upcoming = listUpcoming();
  const portfolio = listPortfolio();
  return (
    <div className="stack">
      <section className="card">
        <h2 style={{ marginTop: 0 }}>Identidade e textos</h2>
        <SimpleActionForm action={saveSettings} submitLabel="Guardar">
          <div className="row" style={{ alignItems: "flex-start" }}>
            <ImageField
              name="logo"
              label="Logótipo"
              current={s.logo_key}
              hint="PNG branco com fundo transparente. Também é usado como marca de água nas fotos carregadas a seguir."
            />
            <ImageField name="hero" label="Imagem de capa (página inicial)" current={s.hero_key} hint="Horizontal, alta qualidade. Sem capa, usa a do último evento." />
            <ImageField name="about_image" label="Foto da página Sobre" current={s.about_image_key} hint="Opcional." />
          </div>
          <div className="row">
            <div className="field">
              <label htmlFor="tagline_pt">Frase de apresentação (PT)</label>
              <input id="tagline_pt" name="tagline_pt" defaultValue={s.tagline_pt} />
            </div>
            <div className="field">
              <label htmlFor="tagline_en">Frase de apresentação (EN)</label>
              <input id="tagline_en" name="tagline_en" defaultValue={s.tagline_en} />
            </div>
          </div>
          <div className="row">
            <div className="field">
              <label htmlFor="about_pt">Texto “Sobre” (PT)</label>
              <textarea id="about_pt" name="about_pt" rows={7} defaultValue={s.about_pt} />
            </div>
            <div className="field">
              <label htmlFor="about_en">Texto “Sobre” (EN)</label>
              <textarea id="about_en" name="about_en" rows={7} defaultValue={s.about_en} placeholder="Se vazio, mostra o texto em português." />
            </div>
          </div>
          <div className="row">
            <div className="field">
              <label htmlFor="contact_email">Email de contacto</label>
              <input id="contact_email" name="contact_email" type="email" defaultValue={s.contact_email} />
              <small>Recebe as mensagens do formulário de contacto.</small>
            </div>
            <div className="field">
              <label htmlFor="phone">Telemóvel / WhatsApp</label>
              <input id="phone" name="phone" defaultValue={s.phone} placeholder="912 345 678" />
            </div>
            <div className="field">
              <label htmlFor="instagram">Instagram</label>
              <input id="instagram" name="instagram" defaultValue={s.instagram} placeholder="@luiscunhaphotos" />
            </div>
            <div className="field">
              <label htmlFor="facebook">Facebook (link)</label>
              <input id="facebook" name="facebook" defaultValue={s.facebook} placeholder="https://facebook.com/…" />
            </div>
          </div>
        </SimpleActionForm>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Próximos eventos</h2>
        {upcoming.length > 0 && (
          <div className="admin-photos" style={{ marginBottom: 20 }}>
            {upcoming.map((u) => (
              <div key={u.id} className="admin-photo">
                {u.image_key ? <img src={siteImageUrl(u.image_key)} alt="" /> : <div style={{ aspectRatio: "3/2" }} />}
                <div className="body">
                  <strong>{u.title}</strong>
                  <span className="muted">{u.date_label}</span>
                  <ConfirmButton action={deleteUpcoming.bind(null, u.id)} message={`Remover "${u.title}"?`} className="link-btn">
                    Remover
                  </ConfirmButton>
                </div>
              </div>
            ))}
          </div>
        )}
        <SimpleActionForm action={addUpcoming} submitLabel="Adicionar próximo evento">
          <div className="row">
            <div className="field">
              <label htmlFor="u-title">Evento *</label>
              <input id="u-title" name="title" required placeholder="Drift Spain — 4.ª ronda" />
            </div>
            <div className="field">
              <label htmlFor="u-date">Data (texto livre)</label>
              <input id="u-date" name="date_label" placeholder="18 a 20 de setembro" />
            </div>
            <div className="field">
              <label htmlFor="u-order">Ordem</label>
              <input id="u-order" name="sort_order" type="number" defaultValue={upcoming.length + 1} />
            </div>
          </div>
          <div className="row">
            <div className="field">
              <label htmlFor="u-details">Detalhes</label>
              <input id="u-details" name="details" placeholder="Circuito de Miranda de Ebro" />
            </div>
            <div className="field">
              <label htmlFor="u-link">Link (opcional)</label>
              <input id="u-link" name="link_url" placeholder="https://…" />
            </div>
            <div className="field">
              <label htmlFor="u-image">Cartaz</label>
              <input id="u-image" name="image" type="file" accept="image/jpeg,image/png,image/webp" />
            </div>
          </div>
        </SimpleActionForm>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Portefólio ({portfolio.length})</h2>
        <SimpleActionForm action={addPortfolio} submitLabel="Adicionar ao portefólio">
          <div className="row">
            <div className="field">
              <label htmlFor="images">Imagens</label>
              <input id="images" name="images" type="file" multiple accept="image/jpeg,image/png,image/webp" />
              <small>As melhores fotos. São reduzidas para 2000 px.</small>
            </div>
            <div className="field">
              <label htmlFor="caption">Legenda (opcional)</label>
              <input id="caption" name="caption" placeholder="CPDrift Pinhel 2026" />
            </div>
          </div>
        </SimpleActionForm>
        {portfolio.length > 0 && (
          <div className="admin-photos" style={{ marginTop: 20 }}>
            {portfolio.map((p) => (
              <div key={p.id} className="admin-photo">
                <img src={siteImageUrl(p.image_key)} alt="" loading="lazy" />
                <div className="body">
                  <span className="muted">{p.caption || "—"}</span>
                  <ConfirmButton action={deletePortfolio.bind(null, p.id)} message="Remover esta imagem do portefólio?" className="link-btn">
                    Remover
                  </ConfirmButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
