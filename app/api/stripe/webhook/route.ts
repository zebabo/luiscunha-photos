import type Stripe from "stripe";
import { config } from "@/lib/config";
import { stripe } from "@/lib/payments";
import { getOrder } from "@/lib/repo";
import { markFailed, markPaid } from "@/lib/orders";

/**
 * Configure no dashboard do Stripe um webhook para /api/stripe/webhook com os eventos:
 * checkout.session.completed, checkout.session.async_payment_succeeded,
 * checkout.session.async_payment_failed, checkout.session.expired
 */
export async function POST(req: Request) {
  if (!config.stripeWebhookSecret) return new Response("Webhook não configurado", { status: 500 });

  const payload = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(payload, req.headers.get("stripe-signature") ?? "", config.stripeWebhookSecret);
  } catch {
    return new Response("Assinatura inválida", { status: 400 });
  }

  if (!event.type.startsWith("checkout.session.")) return Response.json({ received: true });

  const session = event.data.object as Stripe.Checkout.Session;
  const order = getOrder(Number(session.metadata?.orderId ?? session.client_reference_id));
  if (!order) return Response.json({ received: true, ignored: "encomenda desconhecida" });

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      // Multibanco: "completed" chega com payment_status "unpaid"; o pagamento confirma-se depois.
      if (session.payment_status === "paid") {
        if (session.amount_total !== order.total_cents || session.currency !== "eur") {
          console.error(`[stripe] Valor não corresponde na encomenda ${order.id}`, session.amount_total, order.total_cents);
          return new Response("Valor inválido", { status: 400 });
        }
        await markPaid(order.id, session.id);
      }
      break;
    case "checkout.session.async_payment_failed":
      markFailed(order.id, "failed");
      break;
    case "checkout.session.expired":
      markFailed(order.id, "expired");
      break;
  }
  return Response.json({ received: true });
}
