# Ecommerce API — Auth, User e Catálogo

API de e-commerce em [NestJS](https://nestjs.com/) com autenticação JWT (access + refresh token), usuários com papéis (`customer`/`admin`) e catálogo de categorias e produtos, usando [MikroORM](https://mikro-orm.io/) + PostgreSQL.

## Stack

- NestJS 10
- MikroORM (PostgreSQL)
- JWT (`@nestjs/jwt`) com access token + refresh token + recuperação de senha
- `class-validator` / `class-transformer` para validação de DTOs
- Helmet + CORS + rate limiting (`@nestjs/throttler`)
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
| GET | `/user/:id` | Não | Retorna os dados do próprio usuário autenticado (só é possível acessar o próprio `id`) |
| PATCH | `/user/:id` | Não | Atualiza o próprio usuário |
| DELETE | `/user/:id` | Não | Remove o próprio usuário (retorna `204`) |

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

Este projeto cobre auth + user + catálogo, mas antes de usar em produção considere:

- Trocar `MailService` por um provedor de e-mail de verdade (hoje só loga no console)
- Verificação de e-mail no cadastro (`emailVerified`), se necessário para o seu caso de uso
- Próximas fases do e-commerce: carrinho, checkout/pedidos (com baixa de estoque em transação), pagamento (começando por um provider mock) e endereços/avaliações/cupons
- Configurar branch protection no GitHub para o CI realmente bloquear merge quando falhar
