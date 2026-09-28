# Ecommerce API

API de e-commerce em [NestJS](https://nestjs.com/) com autenticação JWT (access + refresh token), usuários com papéis (`customer`/`admin`), catálogo, endereços, carrinho, pedidos com baixa de estoque transacional e pagamento (provider mock), usando [MikroORM](https://mikro-orm.io/) + PostgreSQL.

## Stack

- NestJS 10
- MikroORM (PostgreSQL)
- JWT (`@nestjs/jwt`) com access token + refresh token + recuperação de senha
- `class-validator` / `class-transformer` para validação de DTOs
- Helmet + CORS + rate limiting (`@nestjs/throttler`)
- Swagger/OpenAPI (`@nestjs/swagger`) em `/docs`
- Exception filter global com payload de erro padronizado + logging estruturado de requisições
- Docker (Dockerfile multi-stage) + CI no GitHub Actions

## Setup

```bash
npm install
cp .env.example .env
```

Preencha o `.env` com suas credenciais. Descrição das variáveis:

| Variável | Descrição |
| --- | --- |
| `PORT` | Porta em que a API sobe (default `3000`) |
| `CORS_ORIGIN` | Lista de origens permitidas separadas por vírgula (vazio = libera todas) |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Conexão com o Postgres |
| `JWT_SECRET` | Segredo do access token |
| `JWT_REFRESH_SECRET` | Segredo do refresh token (deve ser diferente do `JWT_SECRET`) |
| `JWT_REFRESH_EXPIRES_IN` | Validade do refresh token (ex: `7d`) |
| `PAYMENT_WEBHOOK_SECRET` | Segredo enviado no header `x-webhook-secret` do webhook de pagamento |
| `NODE_ENV` | `development`, `test` ou `production`. Em `production` o Swagger e as rotas de simulação de pagamento ficam desligados |

Suba o banco de dados local:

```bash
docker-compose up -d postgres
```

As migrations do MikroORM rodam automaticamente no boot da aplicação (`main.ts`). Para criar uma nova migration:

```bash
npm run migration:create
```

### Rodando com Docker

Para subir API + Postgres juntos (útil para onboarding rápido):

```bash
docker-compose up --build
```

A API sobe em `http://localhost:3000`. O `Dockerfile` é multi-stage: builda o projeto e roda só `dist/` + dependências de produção na imagem final.

## Rodando o projeto

```bash
# desenvolvimento
npm run start:dev

# produção
npm run build
npm run start:prod
```

## Documentação da API

Com a API rodando fora de produção, a documentação interativa fica em `http://localhost:3000/docs` e o JSON do OpenAPI em `http://localhost:3000/docs-json`. O front pode gerar tipos a partir dele (ex: `npx openapi-typescript http://localhost:3000/docs-json -o src/api/schema.d.ts`).

## Testes

```bash
npm run test        # unitários
npm run test:e2e     # e2e
npm run test:cov     # cobertura
```

## Rotas

Todas as rotas exigem `Authorization: Bearer <accessToken>`, exceto as marcadas como públicas.

### Auth (`/auth`)

| Método | Rota | Público | Descrição |
| --- | --- | --- | --- |
| POST | `/auth/login` | Sim | Autentica com email/senha e retorna access + refresh token |
| POST | `/auth/refresh` | Sim | Troca um refresh token válido por um novo par de tokens |
| POST | `/auth/logout` | Não | Invalida o refresh token do usuário autenticado |
| POST | `/auth/forgot-password` | Sim | Gera um token de reset (válido por 1h) e "envia" por e-mail. Sempre retorna a mesma mensagem genérica, exista ou não o e-mail, para não vazar quais e-mails estão cadastrados |
| POST | `/auth/reset-password` | Sim | Troca a senha usando o token gerado em `forgot-password`. Token é de uso único e invalida todas as sessões (`refreshToken`) do usuário |

`login`, `refresh`, `forgot-password` e `reset-password` têm rate limit de 5 requisições/minuto por IP para dificultar brute-force.

> **Envio de e-mail é um stub**: `MailService` (`src/mail/mail.service.ts`) só loga o token no console, não envia e-mail de verdade. Antes de produção, troque por um provedor real (nodemailer + SMTP, SES, SendGrid etc.) mantendo a mesma interface (`sendPasswordResetEmail`).

### User (`/user`)

| Método | Rota | Público | Descrição |
| --- | --- | --- | --- |
| POST | `/user` | Sim | Cria um usuário (registro) |
| GET | `/user/me` | Não | Retorna o usuário autenticado |
| GET | `/user/:id` | Não | Retorna os dados do próprio usuário autenticado (só é possível acessar o próprio `id`) |
| PATCH | `/user/:id` | Não | Atualiza o próprio usuário |
| DELETE | `/user/:id` | Não | Remove o próprio usuário (retorna `204`; `409` se ele já tiver pedidos) |

Não existe listagem de todos os usuários nem acesso a dados de terceiros — cada usuário só enxerga a si mesmo. Trocar a senha pelo `PATCH` encerra as outras sessões (limpa o refresh token).

### Papéis (roles)

Todo usuário tem um `role`: `customer` (padrão) ou `admin`. O `role` vai no payload do access token e é checado pelo `RolesGuard` nas rotas marcadas com `@Roles(UserRole.ADMIN)`. Não é possível virar admin pela API; promova o primeiro admin direto no banco e faça login de novo para receber um token com o novo papel:

```sql
UPDATE "user" SET role = 'admin' WHERE email = 'voce@exemplo.com';
```

### Categorias (`/categories`)

| Método | Rota | Acesso | Descrição |
| --- | --- | --- | --- |
| GET | `/categories` | Público | Lista as categorias em ordem alfabética |
| GET | `/categories/:slug` | Público | Retorna uma categoria pelo slug |
| POST | `/categories` | Admin | Cria uma categoria (`name` único; slug gerado a partir do nome) |
| PATCH | `/categories/:id` | Admin | Atualiza nome/descrição (o slug não muda) |
| DELETE | `/categories/:id` | Admin | Remove a categoria; retorna `409` se ainda houver produtos nela |

### Produtos (`/products`)

| Método | Rota | Acesso | Descrição |
| --- | --- | --- | --- |
| GET | `/products` | Público | Lista produtos ativos, paginado |
| GET | `/products/:slug` | Público | Retorna um produto ativo pelo slug |
| POST | `/products` | Admin | Cria um produto |
| PATCH | `/products/:id` | Admin | Atualiza um produto (inclusive `isActive` e `categoryId`) |
| DELETE | `/products/:id` | Admin | Soft delete: marca `isActive = false` e o produto some da vitrine |

Filtros do `GET /products`: `search` (nome, sem diferenciar maiúsculas), `categoryId`, `minPrice`, `maxPrice`, `sort` (`newest` padrão, `price_asc`, `price_desc`), `page` (padrão 1) e `limit` (padrão 20, máx. 100). Resposta:

```json
{ "data": [...], "meta": { "total": 42, "page": 1, "limit": 20, "totalPages": 3 } }
```

Preços são inteiros em centavos (`priceInCents: 29990` = R$ 299,90). `sku` é único (`409` se repetido); nomes podem se repetir e o slug recebe sufixo (`tenis-runner-2`). `images` é uma lista de URLs.

### Endereços (`/addresses`)

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/addresses` | Lista os endereços do usuário (o padrão vem primeiro) |
| GET | `/addresses/:id` | Retorna um endereço do usuário |
| POST | `/addresses` | Cria um endereço |
| PATCH | `/addresses/:id` | Atualiza um endereço |
| DELETE | `/addresses/:id` | Remove um endereço (`204`) |

O primeiro endereço vira padrão automaticamente. Enviar `isDefault: true` desmarca o anterior, e ao remover o padrão o mais recente assume. `zipCode` aceita `01310-100` ou `01310100` (é salvo só com dígitos) e `state` é a UF com 2 letras. Endereços de outros usuários retornam `404`.

### Carrinho (`/cart`)

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/cart` | Retorna o carrinho do usuário (criado sob demanda) |
| POST | `/cart/items` | Adiciona `{ productId, quantity }`; se o produto já estiver no carrinho, soma a quantidade |
| PATCH | `/cart/items/:itemId` | Define a quantidade de um item |
| DELETE | `/cart/items/:itemId` | Remove um item (`204`) |
| DELETE | `/cart` | Esvazia o carrinho (`204`) |

A quantidade não pode passar do estoque (`400`). O carrinho **não reserva** estoque; a checagem definitiva acontece no checkout. Todas as rotas de escrita (exceto os `DELETE`) retornam o carrinho atualizado:

```json
{
  "id": 1,
  "items": [{ "id": 3, "quantity": 2, "lineTotalInCents": 3000, "product": { "id": 10, "name": "...", "slug": "...", "priceInCents": 1500, "images": [], "stock": 7, "isActive": true } }],
  "itemCount": 2,
  "subtotalInCents": 3000
}
```

### Pedidos (`/orders`)

| Método | Rota | Acesso | Descrição |
| --- | --- | --- | --- |
| POST | `/orders` | Cliente | Checkout: transforma o carrinho em pedido. Body `{ addressId }` |
| GET | `/orders` | Cliente | Lista os pedidos do usuário, paginado (filtro opcional `status`) |
| GET | `/orders/:id` | Cliente/Admin | Detalhe com itens e pagamentos (o admin vê qualquer pedido) |
| POST | `/orders/:id/cancel` | Cliente | Cancela um pedido `pending_payment` e devolve o estoque |
| POST | `/orders/:id/pay` | Cliente | Inicia o pagamento (idempotente: reaproveita o pagamento pendente) |
| GET | `/admin/orders` | Admin | Lista todos os pedidos, paginado (filtro opcional `status`) |
| PATCH | `/admin/orders/:id/status` | Admin | Avança o status do pedido. Body `{ status }` |

O checkout roda numa transação: trava as linhas dos produtos (`SELECT ... FOR UPDATE`), valida `isActive` e estoque, decrementa o estoque, cria o pedido e esvazia o carrinho. Se faltar estoque, retorna `409` e nada é alterado. O pedido guarda uma cópia do endereço e de nome, SKU e preço de cada item, então editar o produto ou o endereço depois não altera pedidos antigos.

Fluxo de status:

```
pending_payment ──pagamento aprovado──▶ paid ──admin──▶ shipped ──admin──▶ delivered
       │                                  │
       └─ cliente/admin/pagamento recusado └─ admin ──▶ cancelled (estoque devolvido, pagamento vira refunded)
```

### Pagamentos (`/payments`)

O pagamento passa pela interface `PaymentProvider` (`src/payment/providers/payment-provider.interface.ts`). Hoje só existe o `MockPaymentProvider`; para usar Stripe ou Mercado Pago basta implementar a interface e trocar o provider em `payment.module.ts`.

| Método | Rota | Acesso | Descrição |
| --- | --- | --- | --- |
| POST | `/payments/webhook` | Público (header `x-webhook-secret`) | Recebe `{ externalId, status: "approved" \| "rejected" }` do provider |
| POST | `/payments/mock/:externalId/approve` | Dono do pedido, fora de produção | Simula a aprovação do pagamento |
| POST | `/payments/mock/:externalId/reject` | Dono do pedido, fora de produção | Simula a recusa (o pedido é cancelado e o estoque devolvido) |

Fluxo no front: `POST /orders` → `POST /orders/:id/pay` (retorna `externalId`) → `POST /payments/mock/:externalId/approve` → `GET /orders/:id` com `status: "paid"`. O processamento do webhook é idempotente: eventos repetidos para um pagamento já finalizado são ignorados. Uma aprovação que chega depois de o pedido ter sido cancelado marca o pagamento como `refunded`.

## Segurança

- Guard de autenticação global (`AuthTokenGuard`), com opt-out explícito via `@IsPublic()`
- Senhas com hash `bcrypt`, nunca retornadas nas respostas (`hidden: true` na entity)
- Refresh token armazenado como hash SHA-256 (com `jti` único por token), nunca em texto puro; um refresh token já rotacionado é recusado
- Variáveis de ambiente validadas no boot (`src/config/env.validation.ts`); `JWT_REFRESH_SECRET` precisa ser diferente de `JWT_SECRET`
- E-mails normalizados (trim + minúsculas) no cadastro, login e recuperação de senha
- Helmet + CORS configurados em `main.ts`
- Rate limiting global (`@nestjs/throttler`) e mais restrito em `login`/`refresh`
- Exception filter global (`AllExceptionsFilter`) padroniza o payload de erro (`statusCode`, `timestamp`, `path`, `method`, `message`) e loga erros 5xx como `error`/4xx como `warn`
- `LoggingInterceptor` loga cada requisição (método, path, status, duração) em JSON

## CI

O workflow `.github/workflows/ci.yml` roda em push/PR para `main`: lint, testes unitários, build e e2e contra um Postgres de serviço.

## O que ainda falta para produção

- Trocar `MailService` por um provedor de e-mail de verdade (hoje só loga no console)
- Verificação de e-mail no cadastro (`emailVerified`), se necessário para o seu caso de uso
- Provider de pagamento real (Stripe/Mercado Pago) implementando `PaymentProvider`, com verificação de assinatura do webhook
- Expirar pedidos `pending_payment` antigos (job que cancela e devolve o estoque); hoje o estoque fica preso até o cliente ou o admin cancelar
- Cálculo de frete (`shippingInCents` está fixo em 0)
- Avaliações, cupons e upload de imagens
- Configurar branch protection no GitHub para o CI realmente bloquear merge quando falhar
