import { paymentProvider } from "@/lib/config";
import { buildQuote, parseCartItems } from "@/lib/pricing";
import { createOrder, markFailed, markPaid, setProviderRef } from "@/lib/orders";
import { createStripeCheckout } from "@/lib/payments";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STRIPE_MIN_CENTS = 50;

function bad(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return bad("Pedido inválido.");

  const email = String(body.email ?? "").trim().toLowerCase().slice(0, 200);
  const name = String(body.name ?? "").trim().slice(0, 120);
  const nif = String(body.nif ?? "").replace(/\s/g, "").slice(0, 20);
  const code = typeof body.code === "string" ? body.code.trim() : "";

  if (!EMAIL_RE.test(email)) return bad("Indique um email válido — é para lá que enviamos as fotografias.");
  if (nif && !/^\d{9}$/.test(nif)) return bad("O NIF deve ter 9 dígitos.");
  if (body.acceptTerms !== true) return bad("É necessário aceitar os termos e condições.");

  const quote = buildQuote(parseCartItems(body.items), code || null);
  if (quote.lines.length === 0) return bad("O carrinho está vazio.");
  if (code && quote.discountError) return bad(quote.discountError);
  if (quote.totalCents > 0 && quote.totalCents < STRIPE_MIN_CENTS) return bad("O valor mínimo de encomenda é 0,50 €.");

  // Encomenda gratuita (ex.: código de 100%) — não passa pelo pagamento.
  if (quote.totalCents === 0) {
    const order = createOrder({ email, name, nif, quote, provider: "free" });
    const paid = await markPaid(order.id);
    return Response.json({ url: `/encomenda/${paid!.download_token}` });
  }

  const provider = paymentProvider();
  if (!provider) return bad("Os pagamentos ainda não estão configurados. Tente mais tarde.", 503);

  const order = createOrder({ email, name, nif, quote, provider });

  if (provider === "demo") {
    return Response.json({ url: `/checkout/demo/${order.public_id}` });
  }

  try {
    const session = await createStripeCheckout(order, quote);
    setProviderRef(order.id, session.id);
    return Response.json({ url: session.url });
  } catch (err) {
    console.error("[checkout] Stripe:", err);
    markFailed(order.id, "failed");
    return bad("Não foi possível iniciar o pagamento. Tente novamente.", 502);
  }
}
