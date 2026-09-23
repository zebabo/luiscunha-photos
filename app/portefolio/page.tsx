import type { Metadata } from "next";
import { config } from "@/lib/config";
import { listPortfolio } from "@/lib/repo";
import { siteImageUrl } from "@/lib/media";
import { getT } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("portfolio.title") };
}

export default async function PortfolioPage() {
  const { t } = await getT();
  const items = listPortfolio();
  return (
    <div className="container">
      <h1 className="section-title" style={{ marginTop: 48, marginBottom: 36 }}>
        {t("portfolio.title")}
      </h1>
      <div className="masonry">
        {items.map((p) => (
          <figure key={p.id}>
            <img src={siteImageUrl(p.image_key)} alt={p.caption || config.siteName} loading="lazy" width={p.width} height={p.height} style={{ height: "auto" }} />
            {p.caption && <figcaption>{p.caption}</figcaption>}
          </figure>
        ))}
      </div>
    </div>
  );
}
