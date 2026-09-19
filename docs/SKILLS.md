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

## `recanto-azul-designer` — skill autoral (não copiada de terceiros)

Criada do zero em `~/.claude/skills/recanto-azul-designer/` a pedido do usuário, para atuar como diretor de arte/designer gráfico especializado no Sítio Recanto Azul (hospedagem de experiência em Alfredo Wagner/SC).

Diferente das demais entradas desta página, **não é cópia de nenhuma skill de terceiros**. Antes de escrevê-la, buscou-se no catálogo de plugins da conta algo equivalente a `graphic-design`, `social-media-graphic`, `ad-creative-design`, `banner-design`, `canvas-design`, `ad-creative` e `ad-copy` (repositórios de terceiros citados pelo usuário: `ArnavPuri/designskills`, `borghei/Claude-Skills`, `robpalmer99`) — nenhum estava instalado neste ambiente (`~/.claude/skills/` continha só `session-start-hook`), então a skill foi escrita como conteúdo original, especializado na marca, sem copiar texto de nenhuma fonte externa.

Estrutura:

```
recanto-azul-designer/
├── SKILL.md                              # papel, princípios, workflow de 9 passos, checklist
└── references/
    ├── brand-kit.md                      # posicionamento, paleta, tipografia, estilo permitido/proibido
    ├── acomodacoes.md                    # fonte de verdade das 6 acomodações (nunca inventar dado)
    ├── copywriting.md                    # tom de voz, frases-modelo, clichês a evitar, regras de promoção/preço
    ├── meta-ads.md                       # estrutura de anúncio, variações de teste, requisitos de feed
    └── direcoes-conceituais.md           # como propor as 3 direções (Fotográfica/Editorial/Performance)
└── scripts/
    ├── find_photos.sh                    # varre pastas do projeto por fotos, sem depender do nome bater com a acomodação
    └── scaffold_design_dirs.sh           # cria design/{brand,templates,social,ads,stories,carousels,exports}
```

Validação: `python -m scripts.quick_validate` (do skill-creator oficial da Anthropic) reportou `Skill is valid!`; os dois scripts `.sh` passaram em `bash -n` e foram testados em execução real.

Observação importante: **este ambiente não tem acesso ao acervo real de fotos do Sítio Recanto Azul** (nenhuma pasta de fotos foi encontrada no projeto). A skill já está preparada para localizá-las (`find_photos.sh` varre qualquer diretório informado, sem depender do nome da pasta), mas a etapa de seleção visual das fotos só poderá ser executada quando o acervo estiver acessível a partir de uma sessão futura.
