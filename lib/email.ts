import "server-only";
import nodemailer from "nodemailer";
import { config } from "./config";

type Mail = { to: string; subject: string; html: string; text: string };

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

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export function downloadEmail(opts: { name: string; url: string; photoCount: number; expires: string }) {
  const hello = opts.name ? `Olá ${opts.name},` : "Olá,";
  const text = `${hello}

Obrigado pela sua compra! As suas ${opts.photoCount} fotografia(s) em alta resolução estão prontas.

Descarregar: ${opts.url}

O link é válido até ${opts.expires}. Guarde as fotografias no seu dispositivo.

${config.siteName}`;
  const html = `<div style="font-family:Helvetica,Arial,sans-serif;max-width:520px;margin:auto;color:#1a1a1a">
  <h2 style="font-weight:600">${escapeHtml(config.siteName)}</h2>
  <p>${escapeHtml(hello)}</p>
  <p>Obrigado pela sua compra! As suas <strong>${opts.photoCount}</strong> fotografia(s) em alta resolução estão prontas.</p>
  <p style="margin:28px 0"><a href="${escapeHtml(opts.url)}"
     style="background:#111;color:#fff;padding:14px 22px;border-radius:6px;text-decoration:none">Descarregar fotografias</a></p>
  <p style="color:#666;font-size:14px">O link é válido até ${escapeHtml(opts.expires)}. Guarde as fotografias no seu dispositivo.</p>
</div>`;
  return { subject: `As suas fotografias — ${config.siteName}`, text, html };
}
