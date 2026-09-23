import { buildQuote, parseCartItems } from "@/lib/pricing";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const quote = buildQuote(parseCartItems(body.items), typeof body.code === "string" ? body.code : null);
  return Response.json(quote);
}
