# Ads Manager IA

Gerenciador de anúncios com IA para uso próprio — centraliza Meta Ads e Google Ads: campanhas, métricas, biblioteca de criativos, análise por IA, recomendações e criação de campanhas em rascunho.

**Status:** V1 funcional com dados demo. Meta e Google ainda não conectados — veja [`docs/TOMORROW.md`](docs/TOMORROW.md).

## Stack

- Next.js 16 (App Router) + TypeScript + React 19
- Tailwind CSS v4
- Prisma + SQLite (arquivo local `prisma/dev.db`)
- Vitest para testes

## Rodando localmente

```bash
npm install
npm run db:push   # cria o banco SQLite a partir do schema
npm run seed       # popula dados demo (campanhas, métricas, criativos)
npm run dev        # http://localhost:3000
```

Outros scripts:

```bash
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm run test       # vitest run
npm run build       # next build (roda typecheck junto)
```

## Segurança / regras desta V1

- Meta e Google Ads estão em **modo leitura apenas**. Nenhuma escrita real é possível: `MetaWriteAdapter`/`GoogleWriteAdapter` (`lib/adapters/disabled-write-adapter.ts`) rejeitam qualquer chamada.
- O wizard de campanha (`/drafts/new`) sempre termina em **"Salvar draft"** — nunca publica.
- Enquanto nenhuma conta estiver conectada, o Dashboard e Campanhas mostram **dados demo**, sinalizados visualmente com um selo roxo "DADOS DEMO".
- Nenhuma credencial real foi configurada durante a construção desta V1.

## Documentação

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — arquitetura, adapters, modelo de dados.
- [`docs/META_SETUP.md`](docs/META_SETUP.md) — como conectar Meta Ads (read-only).
- [`docs/GOOGLE_SETUP.md`](docs/GOOGLE_SETUP.md) — como conectar Google Ads (read-only).
- [`docs/SKILLS.md`](docs/SKILLS.md) — skills instaladas e como foram validadas.
- [`docs/TOMORROW.md`](docs/TOMORROW.md) — checklist do que fazer amanhã.
- [`OVERNIGHT_REPORT.md`](OVERNIGHT_REPORT.md) — relatório do que foi construído nesta sessão.
