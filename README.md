# Ads Manager IA

Gerenciador de anúncios com IA para uso próprio — centraliza Meta Ads e Google Ads: campanhas, métricas, biblioteca de criativos, análise por IA, recomendações e criação de campanhas em rascunho.

**Status:** integração real com Meta e Google Ads pronta (read-only) — falta só você preencher as credenciais. Até lá, cada plataforma mostra dados demo automaticamente. Veja [`docs/TOMORROW.md`](docs/TOMORROW.md).

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
- O wizard de campanha (`/drafts/new`) sempre termina em **"Salvar draft"** — o botão "Publicar" existe, mas fica sempre desabilitado.
- Cada plataforma (Meta/Google) mostra **dados demo** até você conectar e sincronizar de verdade — a partir daí, só dados reais aparecem para aquela plataforma (nunca misturados). Ver `docs/ARCHITECTURE.md`, seção "Modo DEMO/REAL".
- Sincronização é sempre **manual** (botão "Sincronizar agora" em `/integrations`) — nunca automática.
- Nenhuma credencial real foi configurada nesta sessão. Passo a passo para conectar: `docs/META_SETUP.md` / `docs/GOOGLE_SETUP.md`.

## Documentação

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — arquitetura, adapters, modelo de dados.
- [`docs/META_SETUP.md`](docs/META_SETUP.md) — como conectar Meta Ads (read-only).
- [`docs/GOOGLE_SETUP.md`](docs/GOOGLE_SETUP.md) — como conectar Google Ads (read-only).
- [`docs/SKILLS.md`](docs/SKILLS.md) — skills instaladas e como foram validadas.
- [`docs/TOMORROW.md`](docs/TOMORROW.md) — checklist do que fazer amanhã.
- [`OVERNIGHT_REPORT.md`](OVERNIGHT_REPORT.md) — relatório da construção da V1 (dados demo).
- [`REAL_DATA_REPORT.md`](REAL_DATA_REPORT.md) — relatório da transição para dados reais (Meta/Google read-only).
