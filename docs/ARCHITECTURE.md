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
    disabled-write-adapter.ts   Toda escrita real fica bloqueada aqui
    meta/read-adapter.ts        Usa meta-ads-open-cli (somente leitura)
    google/read-adapter.ts      Reporta status; chamada real fica para amanhã
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
    campaigns.ts   Agregações de campanhas + período anterior (comparações)
    creatives.ts     Estatísticas de criativos (fadiga, não usados, top)
    period.ts         Resolução de filtros de período
  demo/
    seed-data.ts             Geração determinística de dados demo
    google-keywords.ts        Demo para a IA responder sobre keywords
    google-search-terms.ts    Demo para a IA responder sobre search terms

prisma/schema.prisma   Modelo de dados (SQLite hoje; migrável para Postgres/Supabase)
```

## Por que essas escolhas

- **Next.js App Router**: um único deploy, Server Components eliminam a necessidade de uma API separada para leitura, fácil de rodar localmente.
- **Prisma + SQLite**: zero custo, zero serviço externo, schema já é Postgres-compatível — trocar `datasource.url` para uma connection string Supabase/Postgres é a única mudança necessária no futuro.
- **Sem biblioteca de gráficos externa**: os gráficos (`components/LineChart.tsx`) são SVG inline — menos dependência, menos superfície de bugs, suficiente para séries temporais simples.
- **Sem fila/worker**: todas as operações são request/response síncronas; não há volume que justifique um worker separado nesta fase.

## Modelo de dados (resumo)

- `Campaign` + `CampaignMetricDaily`: uma linha por dia por campanha (Meta ou Google, demo ou real via `isDemo`).
- `Creative` + `CreativeMetricDaily` + `CampaignCreative`: biblioteca de criativos, uso em campanhas e desempenho por dia.
- `Draft`: campanha montada no wizard, nunca publicada.
- `Category`: taxonomia editável usada nos criativos.
- `Settings`: linha única com preferências do negócio.

## Adapters: como trocar a implementação

Cada adapter é acessado por uma função fábrica (`getCreativeStorageAdapter()`, `getAIProvider()`) ou por uma instância exportada (`metaReadAdapter`, `googleReadAdapter`, `DisabledMetaWriteAdapter`). Nenhuma página ou componente importa a implementação concreta diretamente — sempre a interface. Isso permite:

- Trocar `LocalFileSystemStorageAdapter` por Supabase Storage/S3 sem tocar em `app/api/creatives/route.ts`.
- Trocar `MockAIProvider` por um provider real (OpenAI/Anthropic) sem tocar em `app/analyses/page.tsx`.
- Implementar `MetaWriteAdapter`/`GoogleWriteAdapter` de verdade (API oficial ou ArmaVita MCP) sem tocar nas páginas de Drafts/Campanhas — hoje ambos apontam para `DisabledMetaWriteAdapter`/`DisabledGoogleWriteAdapter`, que rejeitam qualquer chamada.
