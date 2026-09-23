import { paymentProvider } from "@/lib/config";
import { buildQuote, parseCartItems } from "@/lib/pricing";
import { createOrder, markFailed, markPaid, setProviderRef } from "@/lib/orders";
import { createStripeCheckout } from "@/lib/payments";
import { getLang } from "@/lib/i18n-server";
import type { DictKey } from "@/lib/i18n";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STRIPE_MIN_CENTS = 50;

// Os erros são devolvidos como chaves de tradução; o carrinho mostra o texto no idioma do cliente.
function bad(error: DictKey, status = 400) {
  return Response.json({ error }, { status });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return bad("err.generic");
  const lang = await getLang();

  const email = String(body.email ?? "").trim().toLowerCase().slice(0, 200);
  const name = String(body.name ?? "").trim().slice(0, 120);
  const nif = String(body.nif ?? "").replace(/\s/g, "").slice(0, 20);
  const code = typeof body.code === "string" ? body.code.trim() : "";

  if (!EMAIL_RE.test(email)) return bad("err.email");
  if (nif && !/^\d{9}$/.test(nif)) return bad("err.nif");
  if (body.acceptTerms !== true) return bad("err.terms");

  const quote = buildQuote(parseCartItems(body.items), code || null);
  if (quote.lines.length === 0) return bad("err.emptyCart");
  if (code && quote.discountError) return bad(`err.${quote.discountError}`);
  if (quote.totalCents > 0 && quote.totalCents < STRIPE_MIN_CENTS) return bad("err.minimum");

  // Encomenda gratuita (ex.: código de 100%) — não passa pelo pagamento.
  if (quote.totalCents === 0) {
    const order = createOrder({ email, name, nif, lang, quote, provider: "free" });
    const paid = await markPaid(order.id);
    return Response.json({ url: `/encomenda/${paid!.download_token}` });
  }

  const provider = paymentProvider();
  if (!provider) return bad("err.paymentsOff", 503);

  const order = createOrder({ email, name, nif, lang, quote, provider });

  if (provider === "demo") {
    return Response.json({ url: `/checkout/demo/${order.public_id}` });
  }

  try {
    const session = await createStripeCheckout(order, quote, lang);
    setProviderRef(order.id, session.id);
    return Response.json({ url: session.url });
  } catch (err) {
    console.error("[checkout] Stripe:", err);
    markFailed(order.id, "failed");
    return bad("err.payment", 502);
  }
}
