# Relatório — Gerenciador de Anúncios com IA (V1)

Construído de forma autônoma em uma sessão, do scaffold ao build final. 7 commits, 66 arquivos de aplicação, 4376 linhas adicionadas.

## O que foi construído

Aplicação web (Next.js) com 7 áreas: **Dashboard, Campanhas, Criativos, Análises, Drafts, Integrações, Configurações**. Centraliza Meta Ads + Google Ads com métricas normalizadas, biblioteca de criativos com upload múltiplo, análise por IA baseada em regras sobre dados reais, e um wizard de criação de campanha que **sempre termina em rascunho, nunca em publicação**.

## O que funciona de verdade (não é só UI estática)

- Dashboard, Campanhas e Análises leem e calculam a partir de dados reais no banco (SQLite), não de texto fixo.
- Upload múltiplo de imagens/vídeos funciona de ponta a ponta: arrasta arquivos → extrai dimensões/duração no navegador → salva no disco via `CreativeStorageAdapter` → grava metadados no banco → aparece na biblioteca.
- A IA mock (`MockAIProvider`) roda queries reais sobre campanhas/criativos e **de fato detectou** a fadiga de criativo simulada nos dados demo quando testado (`"Existe fadiga de criativo?"` → identificou corretamente os 2 criativos com queda de CTR >15%).
- Draft wizard grava no banco via API, com status calculado (`INCOMPLETE` / `READY_FOR_REVIEW`) a partir dos campos preenchidos.
- Todas as 10 páginas testadas manualmente com HTTP 200 após `next build && next start`.

## O que está usando mock/demo

- **Dashboard e Campanhas**: 8 campanhas demo (4 Meta + 4 Google) com 30 dias de histórico cada, geradas deterministicamente (`lib/demo/seed-data.ts`), incluindo tendências propositais de fadiga de criativo, CPA subindo e CTR melhorando — para que Análises tenha o que encontrar. Claramente sinalizado com selo roxo "DADOS DEMO" em toda a UI.
- **12 criativos demo**: metadados reais no banco, mas sem arquivo binário — a biblioteca renderiza um placeholder visual (gradiente + nome do produto + selo "DEMO") em vez de inventar uma imagem falsa.
- **Keywords e search terms do Google** (usados pela IA para responder sobre "palavras-chave ruins"/"search terms desperdiçando"): dados demo estáticos em `lib/demo/google-keywords.ts` e `google-search-terms.ts` — não há ainda integração real com a Google Ads API para isso.
- **AIProvider**: só `MockAIProvider` implementado. Nenhuma chave de OpenAI/Anthropic foi configurada.

## Skills — o que foi instalado vs. já existia

Já existiam (de requisições anteriores desta sessão): `google-ads-api-mcp-setup`, `google-ads-api-quickstart`, `google-ads-api-account-diagnostics` (oficiais `google/skills`), `cross-platform*`, `meta-ads-creative-strategy`, `meta-ads-fatigue-monitor`, `linkedin-ads-creative-strategist` (`foxgeeek/adskills`).

Instaladas nesta sessão: `google-ads` (raiz), `google-ads-performance-auditor`, `google-ads-keyword-analyzer`, `google-ads-search-terms`, `meta-ads-spend-tracker` (todas de `foxgeeek/adskills`) e `meta-ads-open-cli` (gerada via `npx skills add Bin-Huang/meta-ads-open-cli`). Detalhes e validação de cada uma em [`docs/SKILLS.md`](docs/SKILLS.md).

`frontend-design` da Anthropic **não existe** como plugin com esse nome exato; o mais próximo (`design`, Anthropic) é voltado a fluxos colaborativos de design (Figma/Notion), não a gerar código, então não foi instalado — a UI foi construída seguindo boas práticas de design de produto diretamente em Tailwind.

## Stack usada

Next.js 16 (App Router) + TypeScript + React 19 + Tailwind CSS v4 + Prisma 6.19 + SQLite + Vitest. Sem microserviços, sem serviço pago configurado.

## Como está Meta

`MetaReadAdapter` (`lib/adapters/meta/read-adapter.ts`) já chama `meta-ads-open-cli` de verdade quando `META_ADS_ACCESS_TOKEN`/`META_AD_ACCOUNT_ID` existirem no `.env` — hoje reporta `CONFIG_REQUIRED` em `/integrations` porque nenhuma credencial foi configurada (proibido nesta sessão). Escrita: `DisabledMetaWriteAdapter` rejeita qualquer chamada. `armavita-meta-ads-mcp` foi analisado como referência para a futura escrita real, mas não foi conectado, compilado ou autorizado a mutar nada.

## Como está Google

`GoogleReadAdapter` checa as 5 variáveis de ambiente obrigatórias e reporta status em `/integrations`, mas a chamada real à Google Ads API **ainda não foi implementada** (intencional — ver `docs/GOOGLE_SETUP.md` para o próximo passo exato). Escrita: não existe `GoogleWriteAdapter` real, apenas `DisabledGoogleWriteAdapter`.

## Como funciona o upload de criativos

`components/CreativeUploader.tsx` (client) → extrai dimensões/duração no navegador (`Image`/`<video>`, sem libs) → `POST /api/creatives` (multipart) → `LocalFileSystemStorageAdapter` grava em `storage/uploads/` → `Creative` criado no banco → arquivo servido de volta por `GET /api/files/[key]`. Trocar para Supabase Storage/S3 no futuro é implementar `CreativeStorageAdapter` e trocar uma linha em `lib/storage/index.ts` — nenhuma página muda.

## Como conectar amanhã

Checklist objetivo em [`docs/TOMORROW.md`](docs/TOMORROW.md). Resumo: preencher `.env` com credenciais Meta/Google, validar com os CLIs/skills, conferir `/integrations`.

## Testes realizados

23 testes (Vitest), 5 arquivos, 100% passando: normalização de métricas (CTR/CPC/CPM/CPA/ROAS, incluindo divisão por zero e campos ausentes), resolução/comparação de período, geração de dados demo (incluindo a tendência de fadiga), write adapters desabilitados (todas as ações rejeitam), parsing de tags e validação de tipo de arquivo, e status de completude de draft. **Um teste encontrou um bug real** (off-by-one no cálculo de dias de um período customizado) que foi corrigido antes do commit final.

## Resultado do build

`npm run lint` → 0 erros/warnings. `npm run typecheck` → limpo. `npm run test` → 23/23. `npm run build` → sucesso, 20 rotas geradas (10 páginas + 9 API routes + estáticas).

## Problemas encontrados (e como foram resolvidos)

- `prisma@8.0.0-rc` (a versão "latest" do npm) quebra o `datasource.url` tradicional do schema — fixado em `prisma@6.19.3` (última estável antes da mudança de config), que suporta o fluxo simples usado aqui.
- `vitest@5` exigia `@types/node` mais novo que o instalado pelo Next scaffold — fixado em `vitest@3`.
- `npm install` com múltiplos pacotes de uma vez em `prisma@8.0.0-rc` disparava um bug interno do npm (arborist) — resolvido junto com o downgrade do Prisma.
- `npm audit` reporta 3 vulnerabilidades altas em `deepmerge-ts` (dependência interna do **CLI** do Prisma, não do runtime da app) — aceito por ora; corrigir exigiria downgrade adicional do Prisma. Documentado aqui para revisão futura.

## Próximos passos (em ordem de prioridade, conforme pedido)

1. Conectar Meta Ads (read-only) — `docs/META_SETUP.md`.
2. Conectar Google Ads (read-only) — `docs/GOOGLE_SETUP.md`, incluindo implementar a chamada real (hoje só o status é verificado).
3. Enviar criativos reais em `/creatives`.
4. Mapear o array `actions` da Meta Insights API para `conversions` (hoje fixo em 0 no adapter real).
5. Avaliar um provider de IA real (OpenAI/Anthropic) quando fizer sentido — a interface já está pronta em `lib/ai/provider.ts`.
6. Quando (e só quando) autorizado: implementar `MetaWriteAdapter` real (API oficial ou ArmaVita) para permitir publicar drafts.
