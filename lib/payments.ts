import "server-only";
import Stripe from "stripe";
import { config } from "./config";
import type { OrderRow } from "./repo";
import type { Quote } from "./cart-types";
import type { Lang } from "./i18n";
import { lineLabel } from "./orders";

let client: Stripe | null = null;

export function stripe(): Stripe {
  if (!config.stripeSecretKey) throw new Error("STRIPE_SECRET_KEY não configurada");
  client ??= new Stripe(config.stripeSecretKey);
  return client;
}

/**
 * Cria uma sessão Stripe Checkout. Os métodos (cartão, MB Way, Multibanco, Apple/Google Pay)
 * são os que estiverem ativos no dashboard do Stripe — não é preciso alterar código.
 */
export async function createStripeCheckout(order: OrderRow, quote: Quote, lang: Lang): Promise<{ id: string; url: string }> {
  const s = stripe();
  let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined;
  if (quote.discountCents > 0) {
    const coupon = await s.coupons.create({
      amount_off: quote.discountCents,
      currency: "eur",
      duration: "once",
      max_redemptions: 1,
      name: quote.discount?.code ?? "Desconto",
    });
    discounts = [{ coupon: coupon.id }];
  }
  const session = await s.checkout.sessions.create({
    mode: "payment",
    locale: lang === "en" ? "en" : "pt",
    customer_email: order.email,
    client_reference_id: String(order.id),
    metadata: { orderId: String(order.id) },
    payment_intent_data: { metadata: { orderId: String(order.id) } },
    line_items: quote.lines.map((l) => ({
      quantity: 1,
      price_data: {
        currency: "eur",
        unit_amount: l.priceCents,
        product_data: { name: lineLabel(l) },
      },
    })),
    discounts,
    success_url: `${config.siteUrl}/encomenda/sucesso?ref=${order.public_id}`,
    cancel_url: `${config.siteUrl}/carrinho`,
  });
  if (!session.url) throw new Error("O Stripe não devolveu URL de pagamento");
  return { id: session.id, url: session.url };
}
