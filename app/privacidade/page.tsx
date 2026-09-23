import type { Metadata } from "next";
import { config } from "@/lib/config";

export const metadata: Metadata = { title: "Política de privacidade" };

// Modelo base (RGPD) — deve ser revisto e completado com os dados do responsável pelo tratamento.
export default function PrivacyPage() {
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
