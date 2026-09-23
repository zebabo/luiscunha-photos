"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/admin/actions";

type EventValues = {
  title?: string;
  slug?: string;
  description?: string;
  event_date?: string | null;
  location?: string;
  price_photo?: string;
  price_car_pack?: string;
  price_pack?: string;
  published?: boolean;
};

export function EventForm({
  action,
  values = {},
  submitLabel,
  showPublish = false,
}: {
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  values?: EventValues;
  submitLabel: string;
  showPublish?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction}>
      <div className="row">
        <div className="field" style={{ flexGrow: 2 }}>
          <label htmlFor="title">Nome do evento *</label>
          <input id="title" name="title" required defaultValue={values.title} placeholder="Ex.: CPDrift Pinhel" />
        </div>
        <div className="field">
          <label htmlFor="slug">Endereço (URL)</label>
          <input id="slug" name="slug" defaultValue={values.slug} placeholder="gerado automaticamente" />
        </div>
      </div>
      <div className="row">
        <div className="field">
          <label htmlFor="event_date">Data</label>
          <input id="event_date" name="event_date" type="date" defaultValue={values.event_date ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="location">Local</label>
          <input id="location" name="location" defaultValue={values.location} />
        </div>
        <div className="field">
          <label htmlFor="price_photo">Preço por foto (€) *</label>
          <input id="price_photo" name="price_photo" required inputMode="decimal" defaultValue={values.price_photo ?? "5,00"} />
        </div>
        <div className="field">
          <label htmlFor="price_car_pack">Pack piloto (€)</label>
          <input id="price_car_pack" name="price_car_pack" inputMode="decimal" defaultValue={values.price_car_pack} placeholder="vazio = sem pack" />
        </div>
        <div className="field">
          <label htmlFor="price_pack">Pack evento completo (€)</label>
          <input id="price_pack" name="price_pack" inputMode="decimal" defaultValue={values.price_pack} placeholder="vazio = sem pack" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="description">Descrição</label>
        <textarea id="description" name="description" defaultValue={values.description} />
      </div>
      {showPublish && (
        <label className="checkbox field">
          <input type="checkbox" name="published" defaultChecked={values.published} />
          <span>Publicado (visível no site)</span>
        </label>
      )}
      {state?.error && <p className="error">{state.error}</p>}
      {state?.ok && <p className="success">{state.ok}</p>}
      <button className="btn" disabled={pending}>
        {pending ? "A guardar…" : submitLabel}
      </button>
    </form>
  );
}

export function SimpleActionForm({
  action,
  children,
  submitLabel,
}: {
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  children: React.ReactNode;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction}>
      {children}
      {state?.error && <p className="error">{state.error}</p>}
      {state?.ok && <p className="success">{state.ok}</p>}
      <button className="btn" disabled={pending}>
        {pending ? "A guardar…" : submitLabel}
      </button>
    </form>
  );
}
