const eur = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });

export function formatEUR(cents: number): string {
  return eur.format(cents / 100);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Lisbon" });
}

/** Aceita ISO ou o formato UTC do SQLite ("2026-01-31 18:05:00"). */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(value) ? `${value.replace(" ", "T")}Z` : value);
  return d.toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Lisbon" });
}

export function statusLabel(s: string): string {
  return ({ paid: "Paga", pending: "Pendente", failed: "Falhou", expired: "Expirada" } as Record<string, string>)[s] ?? s;
}

/** "12,50" | "12.5" | "12" -> 1250 cêntimos. Devolve null se inválido. */
export function parseEuros(input: string | null | undefined): number | null {
  if (input == null) return null;
  const s = String(input).trim().replace(",", ".");
  if (!s) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  return Math.round(Number(s) * 100);
}

export function centsToInput(cents: number | null | undefined): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** "123, 45 7" -> ["123","45","7"] */
export function parseBibs(input: string | null | undefined): string[] {
  if (!input) return [];
  const bibs = input
    .split(/[\s,;]+/)
    .map((b) => b.trim().toUpperCase())
    .filter((b) => /^[A-Z0-9-]{1,12}$/.test(b));
  return [...new Set(bibs)];
}
