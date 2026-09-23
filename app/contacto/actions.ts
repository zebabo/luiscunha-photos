"use server";

import { config } from "@/lib/config";
import { getSettings } from "@/lib/settings";
import { escapeHtml, sendMail } from "@/lib/email";

export type ContactState = { ok?: boolean; error?: boolean } | undefined;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function sendContact(_prev: ContactState, form: FormData): Promise<ContactState> {
  // Campo escondido: se vier preenchido é um robô.
  if (String(form.get("website") ?? "")) return { ok: true };
  const name = String(form.get("name") ?? "").trim().slice(0, 120);
  const email = String(form.get("email") ?? "").trim().slice(0, 200);
  const message = String(form.get("message") ?? "").trim().slice(0, 5000);
  if (!name || !EMAIL_RE.test(email) || message.length < 5) return { error: true };

  const to = getSettings().contact_email || config.contactEmail;
  if (!to) {
    console.error("[contacto] Sem email de contacto configurado");
    return { error: true };
  }
  await sendMail({
    to,
    replyTo: email,
    subject: `Contacto do site — ${name}`,
    text: `${name} <${email}>\n\n${message}`,
    html: `<p><strong>${escapeHtml(name)}</strong> &lt;${escapeHtml(email)}&gt;</p><p style="white-space:pre-line">${escapeHtml(message)}</p>`,
  });
  return { ok: true };
}
