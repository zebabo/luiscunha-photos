import type { Metadata } from "next";
import { config } from "@/lib/config";
import { getT } from "@/lib/i18n-server";

export const metadata: Metadata = { title: "Termos e condições" };

// Modelo base — deve ser revisto e completado com os dados legais do vendedor.
export default async function TermsPage() {
  const { lang } = await getT();
  if (lang === "en") return <TermsPageEn />;
  return (
    <div className="container prose" style={{ paddingTop: 40 }}>
      <h1>Termos e condições</h1>
      <p className="muted">[Rever com os dados do vendedor: nome/empresa, NIF, morada e contacto.]</p>
      <h2>1. Produto</h2>
      <p>
        {config.siteName} vende fotografias digitais em alta resolução, entregues por download. As pré-visualizações
        no site têm marca de água e resolução reduzida; o ficheiro entregue não tem marca de água.
      </p>
      <h2>2. Preços e pagamento</h2>
      <p>
        Os preços são apresentados em euros e são finais. O pagamento pode ser feito por MB Way, referência
        Multibanco ou cartão, através de uma plataforma de pagamentos segura. Os dados de pagamento não são
        guardados neste site.
      </p>
      <h2>3. Entrega</h2>
      <p>
        Após a confirmação do pagamento, o cliente recebe por email um link para descarregar as fotografias,
        válido durante {config.downloadDays} dias. Pagamentos por Multibanco são confirmados quando a referência for
        paga.
      </p>
      <h2>4. Direito de livre resolução</h2>
      <p>
        Tratando-se de conteúdo digital fornecido de imediato, o cliente consente expressamente no início do
        fornecimento e reconhece que perde o direito de livre resolução (art. 17.º, n.º 1, alínea m) do
        Decreto-Lei n.º 24/2014). Em caso de problema técnico com um ficheiro, contacte-nos para substituição.
      </p>
      <h2>5. Utilização das fotografias</h2>
      <p>
        A compra concede uma licença de uso pessoal e não comercial (ex.: redes sociais pessoais, impressão para uso
        próprio). Os direitos de autor mantêm-se do fotógrafo. Para uso comercial (equipas, patrocinadores,
        publicidade), contacte-nos.
      </p>
      <h2>6. Resolução de litígios</h2>
      <p>
        Em caso de litígio, o consumidor pode recorrer a uma entidade de resolução alternativa de litígios de
        consumo. Mais informações em{" "}
        <a href="https://www.consumidor.gov.pt" target="_blank" rel="noopener noreferrer">
          www.consumidor.gov.pt
        </a>
        .
      </p>
    </div>
  );
}

function TermsPageEn() {
  return (
    <div className="container prose" style={{ paddingTop: 40 }}>
      <h1>Terms and conditions</h1>
      <p className="muted">[To be completed with the seller&apos;s legal details: name/company, tax number, address.]</p>
      <h2>1. Product</h2>
      <p>
        {config.siteName} sells full-resolution digital photos delivered by download. Previews on the website carry a
        watermark and reduced resolution; the delivered file has no watermark.
      </p>
      <h2>2. Prices and payment</h2>
      <p>
        Prices are shown in euros and are final. Payment can be made by MB Way, Multibanco reference or card through a
        secure payment platform. Payment details are not stored on this website.
      </p>
      <h2>3. Delivery</h2>
      <p>
        Once payment is confirmed, you receive an email with a download link valid for {config.downloadDays} days.
        Multibanco payments are confirmed when the reference is paid.
      </p>
      <h2>4. Right of withdrawal</h2>
      <p>
        As digital content supplied immediately, you expressly consent to the start of supply and acknowledge that you
        lose the right of withdrawal (Portuguese Decree-Law 24/2014, art. 17(1)(m)). If a file has a technical problem,
        contact us for a replacement.
      </p>
      <h2>5. Use of photos</h2>
      <p>
        Purchase grants a personal, non-commercial licence (e.g. personal social media, prints for own use). Copyright
        remains with the photographer. For commercial use (teams, sponsors, advertising), please contact us.
      </p>
    </div>
  );
}
