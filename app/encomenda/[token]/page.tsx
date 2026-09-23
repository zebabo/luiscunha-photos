import type { Metadata } from "next";
import { getOrderByToken, getOrderPhotos } from "@/lib/repo";
import { isDownloadValid } from "@/lib/orders";
import { formatDate, formatEUR } from "@/lib/format";
import { thumbUrl } from "@/lib/media";
import { config } from "@/lib/config";
import { ClearCart } from "../sucesso/ClearCart";

export const metadata: Metadata = { title: "As suas fotografias", robots: { index: false, follow: false } };

export default async function OrderDownloads({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const order = getOrderByToken(token);

  if (!isDownloadValid(order)) {
    return (
      <div className="container empty">
        <h1>Link inválido ou expirado</h1>
        <p>
          Se comprou fotografias e o link expirou, contacte-nos
          {config.contactEmail && (
            <>
              {" "}
              em <a href={`mailto:${config.contactEmail}`}>{config.contactEmail}</a>
            </>
          )}{" "}
          e renovamos o acesso.
        </p>
      </div>
    );
  }

  const photos = getOrderPhotos(order.id);
  return (
    <div className="container">
      <ClearCart />
      <section style={{ paddingTop: 40 }}>
        <h1>As suas fotografias</h1>
        <p className="muted">
          Encomenda n.º {order.id} · {formatEUR(order.total_cents)} · {photos.length} fotografia(s) em alta resolução.
          <br />
          Disponível para download até <strong>{formatDate(order.download_expires_at)}</strong>. Guarde-as no seu
          dispositivo.
        </p>
        {photos.length > 1 && (
          <a className="btn" href={`/api/download/${token}/zip`}>
            Descarregar todas (ZIP)
          </a>
        )}
      </section>
      <div className="download-grid">
        {photos.map((p) => (
          <div key={p.id} className="item">
            <img src={thumbUrl(p.file_key)} alt={`Fotografia ${p.id}`} loading="lazy" />
            <a href={`/api/download/${token}/${p.id}`}>Descarregar #{p.id}</a>
          </div>
        ))}
      </div>
    </div>
  );
}
