"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { formatEUR } from "@/lib/format";
import { thumbUrl } from "@/lib/media";
import { cartItemKey, type CartItem, type Quote, type QuoteLine } from "@/lib/cart-types";

function lineItem(l: QuoteLine): CartItem {
  return l.type === "pack" ? { type: "pack", eventId: l.eventId } : { type: "photo", photoId: l.photoId! };
}

export function CartView({ paymentsLabel }: { paymentsLabel: string[] }) {
  const cart = useCart();
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
      .catch(() => !cancelled && setError("Não foi possível calcular o total."));
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
      if (!res.ok) throw new Error(data.error || "Erro ao iniciar o pagamento.");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
      setSubmitting(false);
    }
  }

  if (!cart.ready || (!quote && cart.count > 0)) return <p className="empty">A carregar…</p>;

  if (cart.count === 0 || !quote || quote.lines.length === 0) {
    return (
      <div className="empty">
        <p>O seu carrinho está vazio.</p>
        <Link href="/" className="btn">
          Ver eventos
        </Link>
      </div>
    );
  }

  return (
    <div className="cart-layout">
      <section>
        {quote.lines.map((l) => (
          <div key={cartItemKey(lineItem(l))} className="cart-line">
            {l.thumbKey ? <img src={thumbUrl(l.thumbKey)} alt="" /> : <div />}
            <div>
              <div className="title">{l.label}</div>
              <div className="sub">{l.eventTitle}</div>
            </div>
            <div className="right">
              <div>{formatEUR(l.priceCents)}</div>
              <button className="link-btn" onClick={() => cart.remove(lineItem(l))}>
                Remover
              </button>
            </div>
          </div>
        ))}
        <p className="hint" style={{ marginTop: 12 }}>
          Recebe as fotografias em alta resolução, sem marca de água, por email e nesta página logo após o pagamento.
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
            <label htmlFor="code">Código de desconto</label>
            <input id="code" value={codeInput} onChange={(e) => setCodeInput(e.target.value)} autoComplete="off" />
          </div>
          <button className="btn secondary" type="submit" style={{ flex: "0 0 auto" }}>
            Aplicar
          </button>
        </form>
        {code && quote.discountError && <p className="error">{quote.discountError}</p>}
        {quote.discount && (
          <p className="success">
            Código <strong>{quote.discount.code}</strong> aplicado: {quote.discount.description}.{" "}
            <button
              className="link-btn"
              onClick={() => {
                setCode("");
                setCodeInput("");
              }}
            >
              remover
            </button>
          </p>
        )}

        <div className="line">
          <span>Subtotal</span>
          <span>{formatEUR(quote.subtotalCents)}</span>
        </div>
        {quote.discountCents > 0 && (
          <div className="line">
            <span>Desconto</span>
            <span>−{formatEUR(quote.discountCents)}</span>
          </div>
        )}
        <div className="line total">
          <span>Total</span>
          <span>{formatEUR(quote.totalCents)}</span>
        </div>
        <p className="hint" style={{ marginTop: 0 }}>Preços finais, com IVA incluído quando aplicável.</p>

        <form onSubmit={checkout} style={{ marginTop: 18 }}>
          <div className="field">
            <label htmlFor="email">Email *</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            <small>É para aqui que enviamos o link de download.</small>
          </div>
          <div className="field">
            <label htmlFor="name">Nome</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </div>
          <div className="field">
            <label htmlFor="nif">NIF (opcional, para fatura)</label>
            <input id="nif" value={nif} onChange={(e) => setNif(e.target.value)} inputMode="numeric" maxLength={9} />
          </div>
          <label className="checkbox field">
            <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} required />
            <span>
              Li e aceito os <Link href="/termos" target="_blank">termos e condições</Link> e a{" "}
              <Link href="/privacidade" target="_blank">política de privacidade</Link>. Aceito que o download
              imediato do conteúdo digital implica a perda do direito de livre resolução.
            </span>
          </label>
          {error && <p className="error">{error}</p>}
          <button className="btn block" type="submit" disabled={submitting}>
            {submitting ? "A redirecionar…" : quote.totalCents === 0 ? "Obter fotografias" : `Pagar ${formatEUR(quote.totalCents)}`}
          </button>
          <div className="pay-methods">
            {paymentsLabel.map((m) => (
              <span key={m}>{m}</span>
            ))}
          </div>
        </form>
      </aside>
    </div>
  );
}
