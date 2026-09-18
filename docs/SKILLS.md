# Skills instaladas

Todas em `~/.claude/skills/` (globais). Conteúdo copiado sem alterações das fontes oficiais/comunitárias indicadas.

## Já existentes no início desta sessão

- `google-ads-api-mcp-setup`, `google-ads-api-quickstart`, `google-ads-api-account-diagnostics` — do repositório oficial `google/skills` (instaladas em requisição anterior desta mesma sessão).
- `cross-platform`, `cross-platform-dashboard`, `cross-platform-budget-rebalance`, `cross-platform-crm-sync`, `linkedin-ads-creative-strategist`, `meta-ads-creative-strategy`, `meta-ads-fatigue-monitor` — do repositório comunitário `foxgeeek/adskills`.

## Instaladas nesta sessão

| Skill | Origem | Por quê |
|---|---|---|
| `google-ads` (raiz) | `foxgeeek/adskills` | Skill-pai que orienta o uso das sub-skills de Google Ads abaixo |
| `google-ads-performance-auditor` | `foxgeeek/adskills` | "analisar performance do Google" |
| `google-ads-keyword-analyzer` | `foxgeeek/adskills` | "analisar keywords" |
| `google-ads-search-terms` | `foxgeeek/adskills` | "analisar search terms" |
| `meta-ads-spend-tracker` | `foxgeeek/adskills` | "acompanhar gastos" |
| `meta-ads-open-cli` | Gerada via `npx skills add Bin-Huang/meta-ads-open-cli` (pacote `skills` da Vercel Labs) a partir do repo `Bin-Huang/meta-ads-open-cli` | Documenta o uso do CLI read-only usado pelo `MetaReadAdapter` |

Validação: cada skill foi comparada byte a byte (`diff -rq`) com a fonte antes de copiar para `~/.claude/skills/`; nenhum conteúdo foi editado.

## Ferramentas CLI instaladas

- **`meta-ads-open-cli`** (`npm install -g meta-ads-open-cli`, v1.0.4) — validado com `meta-ads-open-cli --help` e `me`/`ad-accounts`. É o `MetaReadAdapter` desta V1. Todos os seus comandos são de leitura (não existe comando de escrita no CLI).

## `frontend-design` (Anthropic)

Não existe, na marketplace consultada, nenhum plugin/skill chamado exatamente `frontend-design`. O mais próximo é o plugin oficial **`design`** (Anthropic, marketplace `knowledge-work-plugins`), com skills de crítica de design, design system, handoff, UX writing e pesquisa — voltado a fluxos de design colaborativo (Figma, Notion, etc.), não a gerar componentes de código. Como o objetivo aqui era construir a interface em código diretamente, ele não foi instalado; a interface foi construída seguindo boas práticas de design de produto (clean, densidade de dados alta, sidebar, paleta neutra com um único acento, sem gradientes/decoração) descritas em `docs/ARCHITECTURE.md`.

## `armavita-meta-ads-mcp` — apenas referência

Repositório analisado (`EfrainTorres/armavita-meta-ads-mcp`, servidor MCP em Rust com ~125 ferramentas para Meta Ads, incluindo mutações). **Não foi clonado como skill, não foi compilado, nenhum token foi configurado e nenhuma mutação foi habilitada.** Serve apenas como referência de design para uma futura implementação real de `MetaWriteAdapter` — ver `docs/META_SETUP.md`.
