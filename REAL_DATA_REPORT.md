# Relatório — Transição DEMO → Dados Reais

6 commits, 54 arquivos alterados, 84 testes (61 novos). `lint`/`typecheck`/`test`/`build` 100% verdes ao final. Tudo em **READ ONLY** — nenhum write adapter foi ativado, nenhuma credencial foi configurada ou testada contra uma conta real.

## 1. O que foi preparado

- **Modo DEMO/REAL por plataforma** (`lib/data/mode.ts`): assim que existir 1+ campanha real importada para Meta ou Google, aquela plataforma vira `REAL` automaticamente — sem apagar os dados demo (eles só ficam ocultos). Selo na UI mudou de um "DADOS DEMO" global para um indicador por plataforma (`Meta: dados reais` / `Google: DEMO`, por exemplo).
- **Fluxo de conexão completo** para as duas plataformas em `/integrations`: Configurar (.env) → Testar conexão → Selecionar conta → Sincronizar agora → Conectado, com histórico de sincronizações e cooldown básico (3s teste, 30s sync).
- **`MetaReadAdapter` real**, reescrito contra o código-fonte instalado do `meta-ads-open-cli` (não são campos inventados): lista contas, campanhas, insights diários (com `actions`/`conversions`/`conversion_values` mapeados corretamente) e criativos existentes.
- **`GoogleReadAdapter` real** via REST direto (OAuth2 + GAQL), sem SDK: troca de refresh token, `listAccessibleCustomers`, `customer_client` (contas de uma MCC), campanhas e métricas diárias via `googleAds:search`.
- **Sincronização manual idempotente** (`lib/sync.ts`): upsert por `(platform, externalId)` e `(campaignId, date)` — rodar de novo atualiza, nunca duplica.
- **Vínculo read-only de criativos com a Meta** (`lib/adapters/meta/creative-match.ts`): depois de cada sync da Meta, tenta casar criativos da biblioteca com criativos já existentes na conta por nome (nunca baixa/duplica arquivo, nunca altera o anúncio).
- **Ferramenta de diagnóstico** (`/integrations/diagnostics`): compara valor bruto armazenado vs. buscado ao vivo do provedor, e CTR/CPC/CPM/CPA/ROAS oficiais vs. um recálculo feito em código separado (`lib/diagnostics.ts`), de propósito, para pegar bug de fórmula e não só de integração.
- **Períodos com fuso do negócio**: hoje, ontem, 7/14/30 dias, este mês, mês passado, personalizado — calculados com `Intl.DateTimeFormat` no timezone de `Settings`, não no fuso do servidor.
- **Segurança de upload**: limites de tamanho (25MB imagem / 300MB vídeo), limite de 60 arquivos por envio, sanitização de nome de arquivo, e `lib/storage/local-adapter.ts` agora rejeita explicitamente chaves com `..`/separador de caminho.
- **Botão de publicação**: existe no wizard, sempre desabilitado, com "Publicação ainda não habilitada nesta versão".

## 2. O que já funciona de verdade

- Toda a cadeia Configurar → Testar → Selecionar → Sincronizar → Conectado roda de ponta a ponta no código (rotas de API + UI), validado manualmente sem credenciais reais: `/api/integrations/meta/test` e `/api/integrations/google/test` respondem `CONFIG_REQUIRED` com a variável exata que falta quando o `.env` está vazio — não travam, não mentem.
- `syncPlatformCampaigns` foi testado com um adapter falso injetado (sem precisar de Meta/Google reais): cria campanhas/métricas como `isDemo=false`, é idempotente numa segunda chamada, nunca toca em campanhas demo, e grava um `SyncLog` de erro (sem criar nada) quando o "provedor" falha.
- Os parsers GAQL (`lib/adapters/google/gaql.ts`) foram testados contra fixtures no formato exato documentado pela REST API do Google (campanhas, insights, contas MCC) — inclusive conversão de `cost_micros`→moeda e rejeição de ID não-numérico antes de entrar numa query GAQL.
- A ferramenta de diagnóstico já é útil **hoje**, mesmo sem contas conectadas, para conferir que `lib/metrics/calc.ts` está matematicamente correto (o recálculo independente concorda com ele nos casos normais e discorda quando eu quebro um valor de propósito num teste).
- Dashboard/Campanhas/Análises continuam funcionando exatamente como na V1 com dados demo — nada quebrou na transição.

## 3. Credenciais Meta que você precisa fornecer

| Variável | Onde obter |
|---|---|
| `META_ADS_ACCESS_TOKEN` | developers.facebook.com → seu app → gerar token com escopo `ads_read` (+ `pages_read_engagement`, `leads_retrieval` se quiser leads) |
| `META_AD_ACCOUNT_ID` *(opcional)* | Pode ser selecionado pela UI em "Testar conexão" em vez de preencher aqui |

Passo a passo completo: `docs/META_SETUP.md`.

## 4. Credenciais Google que você precisa fornecer

| Variável | Onde obter |
|---|---|
| `GOOGLE_ADS_DEVELOPER_TOKEN` | Google Ads → Ferramentas e Configurações → Centro de API |
| `GOOGLE_ADS_CLIENT_ID` / `GOOGLE_ADS_CLIENT_SECRET` | Google Cloud Console → credenciais OAuth 2.0 |
| `GOOGLE_ADS_REFRESH_TOKEN` | Gerado com as credenciais acima (skill `google-ads-api-quickstart` ajuda) |
| `GOOGLE_ADS_CUSTOMER_ID` *(opcional)* | Pode ser selecionado pela UI em "Testar conexão" |
| `GOOGLE_ADS_LOGIN_CUSTOMER_ID` *(opcional)* | Só se você acessa via conta de agência (MCC) |

Passo a passo completo: `docs/GOOGLE_SETUP.md`.

## 5. Onde obter (resumo rápido)

- Meta: developers.facebook.com/apps
- Google: Google Ads (Centro de API) + Google Cloud Console (OAuth)

## 6. Como testar Meta

`.env` preenchido → `/integrations` → card Meta Ads → **Testar conexão** → escolher conta na lista → **Sincronizar agora**. A mensagem final mostra quantas campanhas foram importadas e o período.

## 7. Como testar Google

`.env` preenchido → `/integrations` → card Google Ads → (Login Customer ID se for MCC) → **Testar conexão** → escolher Customer ID → **Sincronizar agora**.

## 8. Como sincronizar

Sempre manual, pelo botão **Sincronizar agora** em `/integrations` — não existe (nem foi pedido) sincronização automática/agendada nesta versão. Cada tentativa fica no histórico do card (sucesso/erro, quantas campanhas, período).

## 9. Como validar os números

`/integrations/diagnostics` → escolher campanha real + data → **Validar**. Mostra lado a lado o valor armazenado no banco e o valor buscado ao vivo do provedor agora (quando há conta conectada), e os 5 valores calculados (CTR/CPC/CPM/CPA/ROAS) contra um recálculo independente. Nenhum arredondamento acontece antes da comparação — valores brutos ficam sempre no banco, a formatação (R$, %, etc.) é só na tela.

## 10. Problemas encontrados

- `prisma@8.0.0-rc` (versão "latest" do npm) quebra o `datasource.url` tradicional — já resolvido na V1 (fixado em `prisma@6.19.3`).
- Dois arquivos de teste que tocavam o mesmo banco SQLite de teste competiam entre si (`beforeEach` de um apagava dado do outro no meio do teste, já que o Vitest roda arquivos em paralelo) — corrigido dando um banco descartável por arquivo de teste (`tests/setup/test-db.ts`), nunca o `dev.db` real.
- Um teste (`tests/period.test.ts`) pegou um off-by-one real no cálculo de dias de um período customizado, corrigido ainda na V1 — mantido aqui porque explica por que a suíte de período é mais extensa que o normal.
- Não foi possível testar Meta/Google ponta a ponta contra contas reais (nenhuma credencial foi configurada, por instrução explícita) — mitigado testando cada parte que dá para isolar sem rede: parsers, classificação de erro, sincronização com adapter falso, matching de criativos.

## 11. O que continua em mock

- **Keywords e search terms do Google** na página Análises (`lib/demo/google-keywords.ts`, `google-search-terms.ts`) — puxar de verdade é extensão direta do mesmo padrão GAQL, não fiz para manter o foco em campanhas/métricas.
- **`MockAIProvider`** — nenhuma chave de IA paga foi configurada; a interface (`lib/ai/provider.ts`) já entrega dados normalizados, período, plataforma, campanhas, criativos e tendências para quem for implementar um provider real, e nunca inclui token/secret.
- **Dados demo** continuam no banco e aparecem para qualquer plataforma ainda não sincronizada.

## 12. O que continua bloqueado por segurança

- `MetaWriteAdapter` e `GoogleWriteAdapter` — só existem como `DisabledMetaWriteAdapter`/`DisabledGoogleWriteAdapter`, que rejeitam qualquer chamada (`publishCampaign`, `updateBudget`, `pauseCampaign`), testado explicitamente (`tests/disabled-write-adapter.test.ts`).
- Botão "Publicar" no wizard de draft — sempre desabilitado.
- `armavita-meta-ads-mcp` — permanece só como referência de leitura, não foi clonado como skill, não foi compilado, nenhum token foi configurado, nenhuma mutação foi habilitada.
- Nenhuma credencial real foi configurada, testada ou solicitada nesta sessão — tudo documentado em `docs/META_SETUP.md`/`docs/GOOGLE_SETUP.md` para você preencher amanhã.

---

**Próxima ação sua:** preencher o `.env` (Meta e/ou Google) seguindo `docs/META_SETUP.md` / `docs/GOOGLE_SETUP.md`, depois seguir `docs/TOMORROW.md`.
