import type { Metadata } from "next";
import Link from "next/link";
import { config } from "@/lib/config";
import { CartLink, CartProvider } from "@/components/CartProvider";
import "./globals.css";

// Todo o site lê a base de dados a cada pedido.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(config.siteUrl),
  title: { default: config.siteName, template: `%s — ${config.siteName}` },
  description: `Encontre e compre as suas fotografias de eventos em alta resolução — ${config.siteName}.`,
  openGraph: { siteName: config.siteName, locale: "pt_PT", type: "website" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT">
      <body>
        <CartProvider>
          <header className="site-header">
            <div className="container">
              <Link href="/" className="brand">
                {config.siteName}
              </Link>
              <nav className="nav">
                <Link href="/#eventos" className="hide-sm">
                  Eventos
                </Link>
                <Link href="/pesquisa">
                  <span className="hide-sm">Procurar dorsal</span>
                  <span className="show-sm">Dorsal</span>
                </Link>
                <CartLink />
              </nav>
            </div>
          </header>
          <main>{children}</main>
          <footer className="site-footer">
            <div className="container">
              <span>
                © {new Date().getFullYear()} {config.siteName}
              </span>
              <span style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
                <Link href="/termos">Termos e condições</Link>
                <Link href="/privacidade">Privacidade</Link>
                {config.contactEmail && <a href={`mailto:${config.contactEmail}`}>{config.contactEmail}</a>}
                <a href="https://www.livroreclamacoes.pt" target="_blank" rel="noopener noreferrer">
                  Livro de Reclamações
                </a>
              </span>
            </div>
          </footer>
        </CartProvider>
      </body>
    </html>
  );
}
