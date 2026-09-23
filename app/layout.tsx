import type { Metadata } from "next";
import Link from "next/link";
import { config } from "@/lib/config";
import { getSettings, instagramUrl } from "@/lib/settings";
import { getT } from "@/lib/i18n-server";
import { siteImageUrl } from "@/lib/media";
import { CartProvider } from "@/components/CartProvider";
import { I18nProvider } from "@/components/I18nProvider";
import { Header } from "@/components/Header";
import "./globals.css";

// Todo o site lê a base de dados a cada pedido.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { lang } = await getT();
  const s = getSettings();
  const tagline = lang === "en" ? s.tagline_en : s.tagline_pt;
  return {
    metadataBase: new URL(config.siteUrl),
    title: { default: `${config.siteName} — ${tagline}`, template: `%s — ${config.siteName}` },
    description: tagline,
    openGraph: { siteName: config.siteName, locale: lang === "en" ? "en_GB" : "pt_PT", type: "website" },
    icons: s.logo_key ? { icon: siteImageUrl(s.logo_key) } : undefined,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { lang, t } = await getT();
  const s = getSettings();
  return (
    <html lang={lang === "en" ? "en" : "pt-PT"}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@300;400;600;700&display=swap"
        />
      </head>
      <body>
        <I18nProvider lang={lang}>
          <CartProvider>
            <Header siteName={config.siteName} logoUrl={siteImageUrl(s.logo_key)} />
            <main>{children}</main>
            <footer className="site-footer">
              <div className="container">
                <div className="social">
                  {s.instagram && (
                    <a href={instagramUrl(s.instagram)} target="_blank" rel="noopener noreferrer">
                      Instagram
                    </a>
                  )}
                  {s.facebook && (
                    <a href={s.facebook} target="_blank" rel="noopener noreferrer">
                      Facebook
                    </a>
                  )}
                  {s.contact_email && <a href={`mailto:${s.contact_email}`}>{s.contact_email}</a>}
                </div>
                <div className="social">
                  <Link href="/termos">{t("footer.terms")}</Link>
                  <Link href="/privacidade">{t("footer.privacy")}</Link>
                  <a href="https://www.livroreclamacoes.pt" target="_blank" rel="noopener noreferrer">
                    {t("footer.complaints")}
                  </a>
                </div>
                <span>
                  © {new Date().getFullYear()} {config.siteName}
                </span>
              </div>
            </footer>
          </CartProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
