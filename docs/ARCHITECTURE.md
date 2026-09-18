# Arquitetura

Aplicação única em Next.js (App Router), sem microserviços. Server Components fazem a maior parte da leitura de dados direto do Prisma; API Routes cuidam apenas de mutações (upload de criativos, drafts, categorias, configurações, análise de IA).

```
app/
  dashboard/          Dashboard unificado Meta+Google
  campaigns/           Lista + [id] detalhe
  creatives/            Biblioteca de criativos
  analyses/             Perguntas em linguagem natural -> IA
  drafts/               Lista + new (wizard) + [id] (editar)
  integrations/         Status de conexão Meta/Google
  settings/              Negócio, categorias, IA, anúncios
  api/                   Route handlers (mutações)

lib/
  adapters/
    types.ts                    AdReadAdapter / AdWriteAdapter (contratos)
    errors.ts                   AdApiError + classificação CONFIG/AUTH/PERMISSION/RATE_LIMIT
    disabled-write-adapter.ts   Toda escrita real fica bloqueada aqui
    meta/read-adapter.ts        meta-ads-open-cli real (somente leitura), campos verificados na fonte
    meta/creative-match.ts      Vínculo read-only por nome com criativos já existentes na Meta
    google/oauth.ts              Troca refresh_token -> access_token (OAuth2 padrão)
    google/gaql.ts                Builders/parsers GAQL puros (testáveis sem credenciais)
    google/read-adapter.ts       REST direto (googleAds:search) — não exercitado contra conta real
  sync.ts                 Rotina compartilhada de sincronização manual (upsert idempotente)
  integrations.ts          Status não-sensível de conexão (Integration/SyncLog) + resolvers de UI
  diagnostics.ts            Recálculo independente para validar CTR/CPC/CPM/CPA/ROAS
  rate-limit.ts             Cooldown básico em memória para test/sync
  ai/
    provider.ts        Interface AIProvider
    mock-provider.ts    Implementação atual — analisa dados reais via regras
  storage/
    creative-storage-adapter.ts  Interface CreativeStorageAdapter
    local-adapter.ts              Implementação em disco (dev)
  metrics/
    types.ts   NormalizedMetrics / RawMetrics
    calc.ts     Cálculos (CTR, CPC, CPM, CPA, ROAS) com valores ausentes tratados
  data/
    campaigns.ts   Agregações de campanhas + período anterior (comparações) + campaignModeWhere
    creatives.ts     Estatísticas de criativos (fadiga, não usados, top)
    mode.ts           DEMO vs REAL por plataforma
    period.ts         Resolução de filtros de período, timezone-aware (Intl, não o fuso do servidor)
  demo/
    seed-data.ts             Geração determinística de dados demo
    google-keywords.ts        Demo para a IA responder sobre keywords
    google-search-terms.ts    Demo para a IA responder sobre search terms

prisma/schema.prisma   Modelo de dados (Postgres via Supabase — DATABASE_URL pooled + DIRECT_URL direta)
```

## Por que essas escolhas

- **Next.js App Router**: um único deploy, Server Components eliminam a necessidade de uma API separada para leitura, fácil de rodar localmente.
- **Prisma + Postgres (Supabase)**: banco gerenciado, persistente entre deploys — necessário assim que a app roda em serverless (Vercel), já que filesystem local não sobrevive entre invocações. `DATABASE_URL` usa o connection pooler (porta 6543, `pgbouncer=true`) para runtime; `DIRECT_URL` (porta 5432) é usada só por `prisma db push`/`migrate`, que precisam de conexão direta.
- **Sem biblioteca de gráficos externa**: os gráficos (`components/LineChart.tsx`) são SVG inline — menos dependência, menos superfície de bugs, suficiente para séries temporais simples.
- **Sem fila/worker**: todas as operações são request/response síncronas; não há volume que justifique um worker separado nesta fase.

## Modelo de dados (resumo)

- `Campaign` + `CampaignMetricDaily`: uma linha por dia por campanha (Meta ou Google, demo ou real via `isDemo`).
- `Creative` + `CreativeMetricDaily` + `CampaignCreative`: biblioteca de criativos, uso em campanhas e desempenho por dia.
- `Draft`: campanha montada no wizard, nunca publicada.
- `Category`: taxonomia editável usada nos criativos.
- `Settings`: linha única com preferências do negócio (inclui `timezone`, usado por `resolvePeriod`).
- `Integration`: 1 linha por plataforma — conta selecionada, resultado do último teste/sync. **Nunca guarda token/secret**, só IDs não-sensíveis.
- `SyncLog`: histórico de cada tentativa de sincronização (sucesso/erro, quantas campanhas, período).

## Modo DEMO/REAL

`lib/data/mode.ts` decide, por plataforma, se o app está em modo `DEMO` ou `REAL`: assim que existir 1+ campanha real (`isDemo=false`) para aquela plataforma, ela vira `REAL`. `campaignModeWhere()` garante que toda consulta (`getCampaignsWithMetrics`, `getDashboardSummary`, `getCreativeStats`) filtra automaticamente para nunca misturar demo com real — sem precisar apagar os dados demo (eles só ficam ocultos). O selo "DADOS DEMO" na UI (`components/ModeBadges.tsx`) reflete esse estado por plataforma, não um booleano global.

## Sincronização manual

`lib/sync.ts` é o único caminho que grava campanhas/métricas reais no banco. Chamado pelas rotas `app/api/integrations/{meta,google}/sync`, sempre: (1) lista campanhas via o adapter de leitura, (2) faz upsert por `(platform, externalId)`, (3) busca insights diários e faz upsert por `(campaignId, date)` — idempotente, então rodar de novo atualiza em vez de duplicar. Todo resultado (sucesso ou erro) vira uma linha em `SyncLog` e atualiza `Integration`. Nunca é automático/agendado — só dispara quando alguém clica em "Sincronizar agora".

## Adapters: como trocar a implementação

Cada adapter é acessado por uma função fábrica (`getCreativeStorageAdapter()`, `getAIProvider()`) ou por uma instância exportada (`metaReadAdapter`, `googleReadAdapter`, `DisabledMetaWriteAdapter`). Nenhuma página ou componente importa a implementação concreta diretamente — sempre a interface. Isso permite:

- Trocar `LocalFileSystemStorageAdapter` por Supabase Storage/S3 sem tocar em `app/api/creatives/route.ts`.
- Trocar `MockAIProvider` por um provider real (OpenAI/Anthropic) sem tocar em `app/analyses/page.tsx`.
- Implementar `MetaWriteAdapter`/`GoogleWriteAdapter` de verdade (API oficial ou ArmaVita MCP) sem tocar nas páginas de Drafts/Campanhas — hoje ambos apontam para `DisabledMetaWriteAdapter`/`DisabledGoogleWriteAdapter`, que rejeitam qualquer chamada.
