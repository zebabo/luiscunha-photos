"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CartLink } from "./CartProvider";
import { LangSwitch, useI18n } from "./I18nProvider";

export function Header({ siteName, logoUrl }: { siteName: string; logoUrl: string }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  const links = [
    { href: "/", label: t("nav.home") },
    { href: "/eventos", label: t("nav.events") },
    { href: "/portefolio", label: t("nav.portfolio") },
    { href: "/sobre", label: t("nav.about") },
    { href: "/contacto", label: t("nav.contact") },
  ];
  const [first, ...rest] = siteName.split(" ");

  return (
    <header className="site-header">
      <div className="container">
        <Link href="/" className="brand" aria-label={siteName}>
          {logoUrl ? (
            <img src={logoUrl} alt={siteName} />
          ) : (
            <span className="wordmark">
              {first}
              <small>{rest.join(" ")}</small>
            </span>
          )}
        </Link>
        <nav className={`nav ${open ? "open" : ""}`}>
          <div className="nav-links">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={(l.href === "/" ? pathname === "/" : pathname.startsWith(l.href)) ? "active" : ""}
              >
                {l.label}
              </Link>
            ))}
          </div>
          <LangSwitch />
          <CartLink label={t("nav.cart")} />
          <button className="menu-toggle" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? "×" : "☰"}
          </button>
        </nav>
      </div>
    </header>
  );
}
