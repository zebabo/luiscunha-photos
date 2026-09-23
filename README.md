# Luís Cunha Photos — site e loja de fotografia de drift

Site próprio para substituir o Pixieset: portefólio, próximos eventos e **venda direta das fotos dos eventos**,
com pesquisa por carro/piloto, packs e pagamento por MB Way, Multibanco e cartão. Em português, com opção de inglês.

## O que faz

**Para o piloto / cliente**
- Página inicial com capa, pesquisa, eventos recentes, próximos eventos e portefólio
- Em cada evento, **grelha dos carros** (número, piloto, equipa) — clica no seu carro e vê só as suas fotos
- **Pesquisa** por número do carro, nome do piloto ou equipa, em todos os eventos
- Página de cada carro com o **pack do piloto** ("todas as minhas fotos deste evento") e a poupança face a fotos avulsas
- Foto avulsa, pack de piloto e pack de evento completo (o site nunca cobra duas vezes a mesma foto)
- Fotos em batalha (tandem) podem pertencer a dois carros
- **Códigos de desconto** (percentagem ou valor fixo, por evento, com limite de usos e validade)
- Pagamento por **MB Way, Multibanco, cartão, Apple Pay e Google Pay** (Stripe)
- Download imediato dos **originais sem marca de água** (foto a foto ou ZIP) + link por email, válido N dias
- Páginas Sobre e Contacto (formulário, WhatsApp, Instagram), termos e privacidade
- **Português e inglês** (botão PT/EN; na primeira visita segue o idioma do browser)

**Para o fotógrafo (`/admin`)**
- **Site**: logótipo (também usado como marca de água), imagem de capa, textos PT/EN, contactos,
  próximos eventos (com cartaz) e portefólio
- **Eventos**: preços (foto, pack piloto, pack evento), publicar/despublicar
- **Carros**: adicionar um a um ou colar a lista de inscritos (`28; David Karatas; KRT Racing`)
- **Upload por carro**: escolhe o carro, arrasta as fotos desse piloto — ficam logo associadas
- Ações em massa nas fotos: associar/juntar/tirar carro, capa do carro/evento, apagar
- Encomendas (com NIF), reenviar email, marcar como paga; resumo de vendas

**Segurança**
- Os originais ficam numa pasta privada, só acessível com um link de compra válido
- Preços e descontos calculados sempre no servidor
- Pagamentos confirmados por webhook assinado do Stripe, com verificação do valor pago

## Arrancar localmente

Requer Node.js 20+.

```bash
npm install
cp .env.example .env.local      # editar ADMIN_PASSWORD e SESSION_SECRET
npm run dev                     # http://localhost:3000  ·  admin em /admin
```

Sem Stripe configurado o site usa **pagamentos de demonstração** (um botão "Simular pagamento"), útil para
mostrar o fluxo completo. Para gerar dados de teste:

```bash
npm run demo-photos
# cria ./data/demo-fotos/ com: logo.png, inscritos.txt, carro-28/, carro-111/, carro-7/, carro-42/, gerais/
```

Depois, no admin: **Site** → carregar `logo.png`; **Eventos** → criar evento → colar `inscritos.txt` →
escolher cada carro e arrastar a pasta respetiva → publicar.

## Pôr em produção

### 1. Stripe (pagamentos)
1. Criar conta em stripe.com (conta portuguesa, com IBAN para receber)
2. Em **Settings → Payment methods** ativar **MB Way** e **Multibanco** (e cartão, Apple Pay, Google Pay)
3. Em **Developers → API keys** copiar a chave secreta para `STRIPE_SECRET_KEY`
4. Em **Developers → Webhooks** criar um endpoint para `https://O-SEU-DOMINIO/api/stripe/webhook` com os
   eventos `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
   `checkout.session.async_payment_failed` e `checkout.session.expired`. Copiar o "signing secret" para
   `STRIPE_WEBHOOK_SECRET`

> Multibanco é assíncrono: o cliente recebe a referência e as fotos são enviadas automaticamente por email
> quando a referência é paga.

### 2. Email
Configurar `SMTP_*` e `EMAIL_FROM` (ex.: Brevo, Mailgun, Amazon SES ou o SMTP do domínio).

### 3. Alojamento
O site guarda a base de dados (SQLite) e as fotografias em `DATA_DIR`, que tem de ser um **disco persistente**.
Opções adequadas: um VPS (Hetzner, DigitalOcean, OVH) ou Railway/Fly.io/Render com volume. **Não** usar
alojamento "serverless" como a Vercel (não tem disco persistente).

```bash
npm ci && npm run build
NODE_ENV=production npm start     # atrás de nginx/Caddy com HTTPS
```

Fazer **backups** regulares da pasta `DATA_DIR` (contém os originais e as encomendas).

## Antes de vender (obrigações em Portugal)
- **Faturação**: cada venda precisa de fatura emitida em software certificado pela AT (InvoiceXpress,
  Moloni, Vendus…). Por agora o NIF fica registado na encomenda; a integração automática é o próximo passo
  recomendado.
- Completar `/termos` e `/privacidade` com os dados do vendedor (nome/empresa, NIF, morada).
- Livro de Reclamações Eletrónico: registar-se em livroreclamacoes.pt (o link já está no rodapé).

## Próximos passos possíveis
- Emissão automática de fatura (API InvoiceXpress / Moloni)
- Sugestão automática do carro em cada foto (reconhecimento do número/pintura)
- Página do piloto com as fotos de toda a época
- Importar as galerias antigas do Pixieset
- Armazenamento das fotos em Cloudflare R2 / S3 (só é preciso alterar `lib/storage.ts`)
- ifthenpay/Easypay como alternativa ao Stripe (comissões MB Way/Multibanco mais baixas)
- Venda de impressões

## Estrutura
```
app/                 páginas (Next.js App Router)
  admin/             área de administração
  api/               checkout, webhook Stripe, downloads, upload
lib/                 base de dados, preços, pagamentos, imagens, email, autenticação
components/          carrinho, galeria, formulários do admin
scripts/             utilitários (fotos de demonstração)
```
