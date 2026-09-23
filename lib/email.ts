import "server-only";
import nodemailer from "nodemailer";
import { config } from "./config";
import type { Lang } from "./i18n";

type Mail = { to: string; subject: string; html: string; text: string; replyTo?: string };

export async function sendMail(mail: Mail): Promise<void> {
  if (!config.smtp.host) {
    console.log(`\n[email] (SMTP não configurado)\nPara: ${mail.to}\nAssunto: ${mail.subject}\n${mail.text}\n`);
    return;
  }
  const transport = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
  });
  await transport.sendMail({ from: config.emailFrom, ...mail });
}

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

const COPY = {
  pt: {
    hello: (n: string) => (n ? `Olá ${n},` : "Olá,"),
    body: (n: number) => `Obrigado pela tua compra! As tuas ${n} foto(s) em alta resolução estão prontas.`,
    button: "Descarregar fotos",
    valid: (d: string) => `O link é válido até ${d}. Guarda as fotos no teu dispositivo.`,
    subject: "As tuas fotos",
  },
  en: {
    hello: (n: string) => (n ? `Hi ${n},` : "Hi,"),
    body: (n: number) => `Thank you for your purchase! Your ${n} full-resolution photo(s) are ready.`,
    button: "Download photos",
    valid: (d: string) => `The link is valid until ${d}. Save the photos to your device.`,
    subject: "Your photos",
  },
};

export function downloadEmail(opts: { lang: Lang; name: string; url: string; photoCount: number; expires: string }) {
  const c = COPY[opts.lang];
  const text = `${c.hello(opts.name)}

${c.body(opts.photoCount)}

${c.button}: ${opts.url}

${c.valid(opts.expires)}

${config.siteName}`;
  const html = `<div style="font-family:Helvetica,Arial,sans-serif;max-width:520px;margin:auto;color:#1a1a1a">
  <h2 style="font-weight:600;letter-spacing:.08em;text-transform:uppercase">${escapeHtml(config.siteName)}</h2>
  <p>${escapeHtml(c.hello(opts.name))}</p>
  <p>${escapeHtml(c.body(opts.photoCount))}</p>
  <p style="margin:28px 0"><a href="${escapeHtml(opts.url)}"
     style="background:#111;color:#fff;padding:14px 22px;border-radius:4px;text-decoration:none">${c.button}</a></p>
  <p style="color:#666;font-size:14px">${escapeHtml(c.valid(opts.expires))}</p>
</div>`;
  return { subject: `${c.subject} — ${config.siteName}`, text, html };
}
