import path from "node:path";

function env(name: string, fallback = ""): string {
  return process.env[name]?.trim() || fallback;
}

export const config = {
  siteName: env("SITE_NAME", "Galeria de Fotografia"),
  siteUrl: env("SITE_URL", "http://localhost:3000").replace(/\/$/, ""),
  watermarkText: env("WATERMARK_TEXT", `© ${env("SITE_NAME", "Galeria")}`),
  contactEmail: env("CONTACT_EMAIL"),
  adminPassword: env("ADMIN_PASSWORD"),
  sessionSecret: env("SESSION_SECRET"),
  stripeSecretKey: env("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: env("STRIPE_WEBHOOK_SECRET"),
  allowDemoPayments:
    env("ALLOW_DEMO_PAYMENTS") === "true" || process.env.NODE_ENV !== "production",
  smtp: {
    host: env("SMTP_HOST"),
    port: Number(env("SMTP_PORT", "587")),
    user: env("SMTP_USER"),
    pass: env("SMTP_PASS"),
  },
  emailFrom: env("EMAIL_FROM", "fotos@localhost"),
  dataDir: path.resolve(env("DATA_DIR", "./data")),
  downloadDays: Number(env("DOWNLOAD_DAYS", "30")),
};

export function paymentProvider(): "stripe" | "demo" | null {
  if (config.stripeSecretKey) return "stripe";
  if (config.allowDemoPayments) return "demo";
  return null;
}
