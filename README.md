# Galeria — venda de fotografias online

Site próprio para vender fotografias de eventos (trail, corridas, desporto, festas…), feito para substituir
uma galeria Pixieset sem comissões nem mensalidade de plataforma.

## O que faz

**Para o cliente**
- Lista de eventos com capa, data e local
- **Pesquisa por n.º de dorsal** em todos os eventos ou dentro de um evento
- Galeria com pré-visualizações **com marca de água** e visualizador em ecrã inteiro
- Carrinho com fotos avulsas e **packs** ("todas as fotos do evento por X €")
- **Códigos de desconto** (percentagem ou valor fixo, por evento, com limite de usos e validade)
- Pagamento por **MB Way, Multibanco, cartão, Apple Pay e Google Pay** (Stripe)
- Download imediato dos **originais sem marca de água** (foto a foto ou ZIP), com link enviado por email
  e válido durante N dias

**Para o fotógrafo (`/admin`)**
- Criar eventos, definir preços e pack, publicar/despublicar
- Upload em massa (arrastar e largar); as pré-visualizações com marca de água são geradas automaticamente
- Dorsais: por foto, em massa (colar `IMG_0042: 123, 456`) ou **automaticamente pelo nome do ficheiro**
  (`IMG_0042_d123_d456.jpg`)
- Encomendas (com NIF para faturação), reenviar email, marcar como paga manualmente
- Resumo de vendas e eventos que mais vendem

**Segurança**
- Os originais ficam numa pasta privada, nunca acessível sem um link de compra válido
- Preços e descontos calculados sempre no servidor
- Pagamentos confirmados por webhook assinado do Stripe, com verificação do valor pago

**SEO**: páginas por evento com metadados e imagem de partilha, `sitemap.xml`, `robots.txt`, dados estruturados.

## Arrancar localmente

Requer Node.js 20+.

```bash
cd galeria
npm install
cp .env.example .env.local      # editar ADMIN_PASSWORD e SESSION_SECRET
npm run dev                     # http://localhost:3000  ·  admin em /admin
```

Sem Stripe configurado o site usa **pagamentos de demonstração** (um botão "Simular pagamento"), útil para
mostrar o fluxo completo. Para gerar fotografias de teste com dorsais no nome:

```bash
npm run demo-photos      # cria ./data/demo-fotos/*.jpg — arrastar para o upload no admin
```

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
- Armazenamento das fotos em Cloudflare R2 / S3 (só é preciso alterar `lib/storage.ts`)
- Reconhecimento automático de dorsais nas fotos (OCR)
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
