"use client";

import { useActionState } from "react";
import { sendContact } from "./actions";
import { useI18n } from "@/components/I18nProvider";

export function ContactForm() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(sendContact, undefined);
  if (state?.ok) return <p className="notice">{t("contact.sent")}</p>;
  return (
    <form action={action} className="card">
      <div className="field">
        <label htmlFor="name">{t("contact.name")}</label>
        <input id="name" name="name" required autoComplete="name" />
      </div>
      <div className="field">
        <label htmlFor="email">{t("contact.email")}</label>
        <input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="field">
        <label htmlFor="message">{t("contact.message")}</label>
        <textarea id="message" name="message" required rows={6} />
      </div>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" style={{ position: "absolute", left: -9999 }} aria-hidden />
      {state?.error && <p className="error">{t("contact.error")}</p>}
      <button className="btn" disabled={pending}>
        {pending ? t("contact.sending") : t("contact.send")}
      </button>
    </form>
  );
}
