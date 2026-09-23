"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { useI18n } from "@/components/I18nProvider";
import { formatEUR } from "@/lib/format";
import { thumbUrl } from "@/lib/media";
import { cartItemKey, type CartItem, type Quote, type QuoteLine } from "@/lib/cart-types";
import type { DictKey } from "@/lib/i18n";

function lineItem(l: QuoteLine): CartItem {
  if (l.type === "pack") return { type: "pack", eventId: l.eventId };
  if (l.type === "carpack") return { type: "carpack", carId: l.carId! };
  return { type: "photo", photoId: l.photoId! };
}

export function CartView({ demo }: { demo: boolean }) {
  const cart = useCart();
  const { t, lang } = useI18n();
  const eur = (c: number) => formatEUR(c, lang);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [nif, setNif] = useState("");
  const [accept, setAccept] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!cart.ready) return;
    let cancelled = false;
    fetch("/api/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: cart.items, code }),
    })
      .then((r) => r.json())
      .then((q: Quote) => {
        if (cancelled) return;
        setQuote(q);
        // Limpa do carrinho o que já não existe ou ficou incluído num pack.
        if (q.dropped.length > 0) {
          const drop = new Set(q.dropped.map(cartItemKey));
          cart.replace(cart.items.filter((i) => !drop.has(cartItemKey(i))));
        }
      })
      .catch(() => !cancelled && setError(t("cart.error")));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.ready, cart.items, code]);

  async function checkout(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cart.items, code, email, name, nif, acceptTerms: accept }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(t((data.error as DictKey) ?? "err.generic"));
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : t("err.generic"));
      setSubmitting(false);
    }
  }

  function lineTitle(l: QuoteLine) {
    if (l.type === "pack") return t("cart.pack", { n: l.photoCount });
    if (l.type === "carpack") return t("cart.carpack", { subject: l.subject, n: l.photoCount });
    return t("cart.photo", { subject: l.subject });
  }

  if (!cart.ready || (!quote && cart.count > 0)) return <p className="empty">{t("cart.loading")}</p>;

  if (cart.count === 0 || !quote || quote.lines.length === 0) {
    return (
      <div className="empty">
        <p>{t("cart.empty")}</p>
        <Link href="/eventos" className="btn">
          {t("cart.browse")}
        </Link>
      </div>
    );
  }

  const [termsBefore, rest] = t("cart.terms").split("{terms}");
  const [termsMiddle, termsAfter] = (rest ?? "").split("{privacy}");

  return (
    <div className="cart-layout">
      <section>
        {quote.lines.map((l) => (
          <div key={cartItemKey(lineItem(l))} className="cart-line">
            {l.thumbKey ? <img src={thumbUrl(l.thumbKey)} alt="" /> : <div />}
            <div>
              <div className="title">{lineTitle(l)}</div>
              <div className="sub">{l.eventTitle}</div>
            </div>
            <div className="right">
              <div>{eur(l.priceCents)}</div>
              <button className="link-btn" onClick={() => cart.remove(lineItem(l))}>
                {t("cart.remove")}
              </button>
            </div>
          </div>
        ))}
        <p className="hint" style={{ marginTop: 12 }}>
          {t("cart.delivery")}
        </p>
      </section>

      <aside className="card summary">
        <form
          className="row"
          style={{ marginBottom: 12 }}
          onSubmit={(e) => {
            e.preventDefault();
            setCode(codeInput.trim());
          }}
        >
          <div style={{ flex: "1 1 auto" }}>
            <label htmlFor="code">{t("cart.code")}</label>
            <input id="code" value={codeInput} onChange={(e) => setCodeInput(e.target.value)} autoComplete="off" />
          </div>
          <button className="btn secondary" type="submit" style={{ flex: "0 0 auto" }}>
            {t("cart.apply")}
          </button>
        </form>
        {code && quote.discountError && <p className="error">{t(`err.${quote.discountError}`)}</p>}
        {quote.discount && (
          <p className="success">
            {t("cart.codeApplied", {
              code: quote.discount.code,
              desc: t("cart.off", {
                value: quote.discount.kind === "percent" ? `${quote.discount.value}%` : eur(quote.discount.value),
              }),
            })}{" "}
            <button
              className="link-btn"
              onClick={() => {
                setCode("");
                setCodeInput("");
              }}
            >
              {t("cart.codeRemove")}
            </button>
          </p>
        )}

        <div className="line">
          <span>{t("cart.subtotal")}</span>
          <span>{eur(quote.subtotalCents)}</span>
        </div>
        {quote.discountCents > 0 && (
          <div className="line">
            <span>{t("cart.discount")}</span>
            <span>−{eur(quote.discountCents)}</span>
          </div>
        )}
        <div className="line total">
          <span>{t("cart.total")}</span>
          <span>{eur(quote.totalCents)}</span>
        </div>
        <p className="hint" style={{ marginTop: 0 }}>
          {t("cart.vat")}
        </p>

        <form onSubmit={checkout} style={{ marginTop: 18 }}>
          <div className="field">
            <label htmlFor="email">{t("cart.email")} *</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            <small>{t("cart.emailHint")}</small>
          </div>
          <div className="field">
            <label htmlFor="name">{t("cart.name")}</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </div>
          <div className="field">
            <label htmlFor="nif">{t("cart.nif")}</label>
            <input id="nif" value={nif} onChange={(e) => setNif(e.target.value)} inputMode="numeric" maxLength={9} />
          </div>
          <label className="checkbox field">
            <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} required />
            <span>
              {termsBefore}
              <Link href="/termos" target="_blank">
                {t("cart.termsLink")}
              </Link>
              {termsMiddle}
              <Link href="/privacidade" target="_blank">
                {t("cart.privacyLink")}
              </Link>
              {termsAfter}
            </span>
          </label>
          {error && <p className="error">{error}</p>}
          <button className="btn block accent" type="submit" disabled={submitting}>
            {submitting
              ? t("cart.redirecting")
              : quote.totalCents === 0
                ? t("cart.getFree")
                : t("cart.pay", { price: eur(quote.totalCents) })}
          </button>
          <div className="pay-methods">
            {(demo ? [t("cart.demo")] : ["MB Way", "Multibanco", "Visa / Mastercard", "Apple Pay", "Google Pay"]).map((m) => (
              <span key={m}>{m}</span>
            ))}
          </div>
        </form>
      </aside>
    </div>
  );
}
