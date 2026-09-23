import type { Metadata } from "next";
import Link from "next/link";
import { config } from "@/lib/config";
import { getSettings } from "@/lib/settings";
import { siteImageUrl } from "@/lib/media";
import { getT } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("about.title") };
}

export default async function AboutPage() {
  const { lang, t } = await getT();
  const s = getSettings();
  const text = (lang === "en" ? s.about_en : s.about_pt) || s.about_pt;
  return (
    <div className="container">
      <h1 className="section-title" style={{ marginTop: 48, marginBottom: 36 }}>
        {t("about.title")}
      </h1>
      <div className="about">
        {s.about_image_key && <img src={siteImageUrl(s.about_image_key)} alt={config.siteName} />}
        <div>
          <div className="text">{text}</div>
          <p style={{ marginTop: 28 }}>
            <Link className="btn" href="/contacto">
              {t("nav.contact")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
