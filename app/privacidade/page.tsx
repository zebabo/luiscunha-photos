import type { Metadata } from "next";
import { config } from "@/lib/config";
import { getT } from "@/lib/i18n-server";

export const metadata: Metadata = { title: "Política de privacidade" };

// Modelo base (RGPD) — deve ser revisto e completado com os dados do responsável pelo tratamento.
export default async function PrivacyPage() {
  const { lang } = await getT();
  if (lang === "en") return <PrivacyPageEn />;
  return (
    <div className="container prose" style={{ paddingTop: 40 }}>
      <h1>Política de privacidade</h1>
      <p className="muted">[Rever com os dados do responsável pelo tratamento: nome, NIF, morada e contacto.]</p>
      <h2>Que dados recolhemos</h2>
      <p>
        Para processar encomendas recolhemos o email, o nome e, se indicado, o NIF para faturação. Os pagamentos são
        processados pelo Stripe; não guardamos dados de cartão.
      </p>
      <h2>Para que usamos os dados</h2>
      <p>
        Para entregar as fotografias compradas, emitir a fatura e cumprir obrigações legais. Não enviamos publicidade
        sem consentimento.
      </p>
      <h2>Fotografias de eventos</h2>
      <p>
        As fotografias são captadas em eventos públicos. Se aparece numa fotografia e pretende que seja removida da
        galeria, contacte-nos
        {config.contactEmail && (
          <>
            {" "}
            em <a href={`mailto:${config.contactEmail}`}>{config.contactEmail}</a>
          </>
        )}{" "}
        e trataremos do pedido com prioridade.
      </p>
      <h2>Conservação</h2>
      <p>Os dados de faturação são conservados pelo prazo legal exigido. Os restantes, apenas enquanto necessários.</p>
      <h2>Os seus direitos</h2>
      <p>
        Pode pedir acesso, retificação ou eliminação dos seus dados, e apresentar reclamação à CNPD (
        <a href="https://www.cnpd.pt" target="_blank" rel="noopener noreferrer">
          www.cnpd.pt
        </a>
        ).
      </p>
    </div>
  );
}

function PrivacyPageEn() {
  return (
    <div className="container prose" style={{ paddingTop: 40 }}>
      <h1>Privacy policy</h1>
      <p className="muted">[To be completed with the data controller&apos;s details: name, tax number, address, contact.]</p>
      <h2>What we collect</h2>
      <p>
        To process orders we collect your email, name and, if provided, your tax number for invoicing. Payments are
        processed by Stripe; we do not store card details.
      </p>
      <h2>How we use it</h2>
      <p>To deliver the purchased photos, issue the invoice and comply with legal obligations. No marketing without consent.</p>
      <h2>Event photos</h2>
      <p>
        Photos are taken at public events. If you appear in a photo and want it removed from the gallery, contact us
        {config.contactEmail && (
          <>
            {" "}
            at <a href={`mailto:${config.contactEmail}`}>{config.contactEmail}</a>
          </>
        )}{" "}
        and we will handle it as a priority.
      </p>
      <h2>Your rights</h2>
      <p>
        You may request access, rectification or erasure of your data, and lodge a complaint with the Portuguese data
        protection authority (CNPD).
      </p>
    </div>
  );
}
