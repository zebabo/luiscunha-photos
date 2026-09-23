import type { Metadata } from "next";
import { getOrderByToken, getOrderPhotos } from "@/lib/repo";
import { isDownloadValid } from "@/lib/orders";
import { formatDate } from "@/lib/format";
import { thumbUrl } from "@/lib/media";
import { getSettings } from "@/lib/settings";
import { getT } from "@/lib/i18n-server";
import { ClearCart } from "../sucesso/ClearCart";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function OrderDownloads({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const order = getOrderByToken(token);
  const { lang, t } = await getT();

  if (!isDownloadValid(order)) {
    const email = getSettings().contact_email;
    return (
      <div className="container empty">
        <h1>{t("dl.invalid")}</h1>
        <p>{t("dl.invalidHint")}</p>
        {email && <a href={`mailto:${email}`}>{email}</a>}
      </div>
    );
  }

  const photos = getOrderPhotos(order.id);
  return (
    <div className="container">
      <ClearCart />
      <section style={{ paddingTop: 40 }}>
        <h1>{t("dl.title")}</h1>
        <p className="muted">
          {t("dl.summary", { id: order.id, n: photos.length })}
          <br />
          {t("dl.until", { date: formatDate(order.download_expires_at, lang) })}
        </p>
        {photos.length > 1 && (
          <a className="btn accent" href={`/api/download/${token}/zip`}>
            {t("dl.zip")}
          </a>
        )}
      </section>
      <div className="download-grid">
        {photos.map((p) => (
          <div key={p.id} className="item">
            <img src={thumbUrl(p.file_key)} alt={`#${p.id}`} loading="lazy" />
            <a href={`/api/download/${token}/${p.id}`}>
              {t("dl.one")} #{p.id}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
