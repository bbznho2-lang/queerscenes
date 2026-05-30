# Fluxo de assinatura de apoiadores via Stripe

## Decisão importante — sua conta Stripe
Os `price_id` que você passou (`price_1Tcr...`) são da **sua** conta Stripe. Por isso vamos usar a integração **Stripe BYOK** (Bring Your Own Key), e não o Stripe nativo da Lovable (que criaria preços novos). Você vai precisar fornecer:

- `STRIPE_SECRET_KEY` (chave secreta da sua conta Stripe — `sk_live_...` ou `sk_test_...`)
- `STRIPE_WEBHOOK_SECRET` (gerado depois que eu criar o endpoint do webhook)

Eu vou pedir esses segredos com a ferramenta segura quando chegar a hora.

## O que vai ser feito

### 1. Landing page (`/`) — seção de planos
- Adicionar um campo de **e-mail** acima dos 3 cards de plano.
- Validar formato antes de habilitar os botões.
- Remover os atuais botões/links de Telegram que redirecionam para checkout manual.
- Manter o visual neon existente (rosa Mensal / roxo Trimestral / azul Anual).
- Cada botão "Assinar" envia `{ email, priceId }` para uma Edge Function que devolve a URL do Stripe Checkout e redireciona.
- Mapeamento:
  - Mensal → `price_1TcrpkJ5xR4MDdjr0jHKThue` (1 mês)
  - Trimestral → `price_1TcrrpJ5xR4MDdjrEx4LeBub` (3 meses)
  - Anual → `price_1TcrtPJ5xR4MDdjrM2sTnTPr` (12 meses)

### 2. Conteúdo "supporter"
- Hoje, ao clicar em um conteúdo premium sem ser apoiador, abre paywall no Player. Vou mudar para **redirecionar para `/#planos`** (a mesma seção da landing) — mantendo a regra que admins e apoiadores ativos passam direto.

### 3. Banco de dados (Lovable Cloud)
Tabela nova `pending_supporters` para guardar pagamentos de e-mails que ainda não criaram conta:
- `email`, `plan` (monthly/quarterly/yearly), `premium_expires_at`, `stripe_customer_id`, `stripe_subscription_id`, `status`.
- Apenas o `service_role` (webhook) escreve; usuário comum não lê.

Função `claim_supporter_for_current_user()` (SECURITY DEFINER): quando um usuário loga/cadastra, procura em `pending_supporters` por e-mail e copia `is_premium=true`, `premium_plan` e `premium_expires_at` para o `profiles` dele. Marca o pending como `claimed`.

### 4. Edge Functions
- `create-checkout` — recebe `{ email, priceId }`, cria sessão do Stripe com `customer_email`, `mode: subscription`, `success_url` para `/?supporter=success&email=...`, `cancel_url` para `/#planos`. Retorna a URL.
- `stripe-webhook` — escuta `checkout.session.completed` e `invoice.paid`. Calcula expiração pelo `priceId` (1 / 3 / 12 meses) e faz `upsert` em `pending_supporters` e, se já existir profile com aquele e-mail, atualiza direto.

Ambas com `verify_jwt = false` no `config.toml` (webhook precisa ser público; checkout pode ser chamado por usuários anônimos).

### 5. Vinculação automática no login/cadastro
- No `useAuth`, após `SIGNED_IN`, chamar `claim_supporter_for_current_user()`.
- Também chamar no `Index` quando a URL tiver `?supporter=success` (caso o usuário já esteja logado).

### 6. Selo de apoiador no perfil
- No `ProfileDialog`, adicionar um badge "👑 Supporter" quando `profile.is_premium && (premium_expires_at IS NULL OR > now())`, mostrando o plano e a data de expiração.

## Detalhes técnicos
- A trigger `protect_profile_premium_fields` já bloqueia usuários comuns de alterarem `is_premium`. A função `claim_supporter_for_current_user` é SECURITY DEFINER, então passa por cima dela com segurança (só atualiza se houver pagamento válido no `pending_supporters`).
- O webhook valida assinatura com `Stripe.webhooks.constructEventAsync` usando `STRIPE_WEBHOOK_SECRET`.
- Depois que o webhook for deployado, eu te dou a URL pública (`https://<project>.functions.supabase.co/stripe-webhook`) para você colar em **Stripe Dashboard → Developers → Webhooks** e pegar o `whsec_...` — só então adiciono o segredo.

## Ordem de execução
1. Migração: tabela `pending_supporters` + função `claim_supporter_for_current_user`.
2. Pedir `STRIPE_SECRET_KEY`.
3. Criar Edge Functions `create-checkout` e `stripe-webhook`.
4. Atualizar landing (`Index.tsx`) — campo de e-mail, botões dos planos chamando `create-checkout`, remover Telegram.
5. Atualizar `Player.tsx` — paywall redireciona para `/#planos`.
6. Atualizar `useAuth` / `ProfileDialog` — claim automático + selo.
7. Te passo a URL do webhook; você cria no Stripe Dashboard e me dá o `STRIPE_WEBHOOK_SECRET`.

Posso seguir?