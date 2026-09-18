# Conectar Google Ads (read-only)

`lib/adapters/google/read-adapter.ts` chama a **API REST oficial do Google Ads diretamente** (sem client library), usando OAuth2 + GAQL (`lib/adapters/google/oauth.ts` e `lib/adapters/google/gaql.ts`). As skills `google-ads-api-mcp-setup`, `google-ads-api-quickstart` e `google-ads-api-account-diagnostics` (instaladas globalmente do repositório oficial `google/skills`) ajudam com os passos manuais abaixo.

**Importante — versão da API:** o código usa `v25` como padrão (confirmado por busca em 18/09/2026), mas **nunca deve ficar hardcoded** — versões maiores do Google Ads API saem do ar cerca de 1x/ano. Se a versão já tiver mudado quando você for conectar de verdade, defina `GOOGLE_ADS_API_VERSION` no `.env` (veja o link de release notes no `.env.example`) ou peça para rodar a skill `google-ads-api-quickstart`, que resolve a versão atual automaticamente.

## Passo a passo

1. Solicitar um **Developer Token** na sua conta Google Ads (Ferramentas e Configurações → Centro de API).
2. Criar credenciais OAuth 2.0 (Client ID + Client Secret) no Google Cloud Console.
3. Gerar um **Refresh Token** (a skill `google-ads-api-quickstart` tem o passo a passo e scripts de exemplo para isso).
4. Preencher no `.env` (veja `.env.example`):
   ```
   GOOGLE_ADS_DEVELOPER_TOKEN=
   GOOGLE_ADS_CLIENT_ID=
   GOOGLE_ADS_CLIENT_SECRET=
   GOOGLE_ADS_REFRESH_TOKEN=
   ```
   `GOOGLE_ADS_CUSTOMER_ID` é **opcional** — se souber o Customer ID, pode preenchê-lo para pular a seleção pela UI.
5. Abrir `/integrations` no app.
6. No card **Google Ads**:
   - Se você acessa a conta via uma conta de agência (MCC), preencha o **Login Customer ID** antes de testar.
   - Clique em **Testar conexão** — troca o refresh token por um access token e chama `customers:listAccessibleCustomers` (mais leve possível, só valida credenciais).
   - Selecione o Customer ID na lista e clique em **Usar esta conta**.
   - Clique em **Sincronizar agora** para importar campanhas e métricas dos últimos 30 dias.

## O que a sincronização faz

- Consulta `customer/{id}/googleAds:search` com GAQL para listar campanhas (`SELECT campaign.id, campaign.name, campaign.status, ...`) e, para cada uma, métricas diárias (`metrics.impressions`, `metrics.clicks`, `metrics.cost_micros`, `metrics.conversions`, `metrics.conversions_value`).
- `cost_micros` e `campaign_budget.amount_micros` são convertidos de micros para a moeda da conta (÷ 1.000.000); `conversions`/`conversions_value` **não** são micros e são usados como estão.
- Grava campanhas como **dados reais** (`isDemo=false`) — dados demo continuam no banco, só ficam ocultos assim que existir 1+ campanha real (ver `docs/ARCHITECTURE.md`).
- Registra cada tentativa em um histórico visível no card, com cooldown de 30s entre sincronizações.

## Ainda não implementado nesta V1

- **Keywords e search terms reais**: a página Análises hoje responde perguntas sobre keywords/search terms usando dados de demonstração (`lib/demo/google-keywords.ts`, `google-search-terms.ts`). Puxar isso de verdade é uma extensão natural do mesmo padrão GAQL já implementado (`SELECT ad_group_criterion... FROM keyword_view` / `FROM search_term_view`) — não foi feito para manter o escopo desta etapa focado em campanhas/métricas.
- **Impression share e Quality Score**: mesma situação — os campos existem na API (`metrics.search_impression_share`, `ad_group_criterion.quality_info.quality_score`) mas ainda não estão na query de sincronização.

## Não testado contra conta real

Nada disso foi exercitado contra uma conta Google Ads de verdade nesta sessão (nenhuma credencial foi configurada, por instrução explícita). O que **foi** validado sem precisar de credenciais:
- Os builders de query GAQL e os parsers de resposta (`lib/adapters/google/gaql.ts`) contra fixtures no formato exato documentado pelo Google (ver `tests/google-gaql.test.ts`).
- A troca de refresh token por access token segue o endpoint OAuth2 padrão do Google (`https://oauth2.googleapis.com/token`), mas depende de credenciais reais para ser testada ponta a ponta.

Use `/integrations/diagnostics` assim que conectar para comparar valor armazenado vs. buscado ao vivo, campanha a campanha.

## Segurança

- Nenhuma credencial Google foi configurada ou testada nesta sessão.
- Developer token, client secret e refresh token só existem como variáveis de ambiente no servidor — nunca no navegador, nunca no banco, nunca em log. O access token de curta duração fica em cache só em memória do processo Node.
- Não existe (e não foi criado) nenhum `GoogleWriteAdapter` real — `DisabledGoogleWriteAdapter` rejeita qualquer chamada de escrita.
