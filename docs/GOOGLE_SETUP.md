# Conectar Google Ads (read-only)

Caminho preferencial: **API oficial do Google Ads** (ou o Google Ads MCP Server oficial). As skills `google-ads-api-mcp-setup`, `google-ads-api-quickstart` e `google-ads-api-account-diagnostics` (instaladas globalmente a partir do repositório oficial `google/skills`) guiam esse processo passo a passo dentro do próprio Claude Code.

## Passo a passo

1. Solicitar um **Developer Token** na sua conta Google Ads (Ferramentas e Configurações → Centro de API).
2. Criar credenciais OAuth 2.0 (Client ID + Client Secret) no Google Cloud Console.
3. Gerar um **Refresh Token** (a skill `google-ads-api-quickstart` tem o passo a passo e scripts de exemplo para isso).
4. Descobrir o **Customer ID** da conta (e o **Login Customer ID**, se você acessa via conta MCC/agência).
5. Preencher no `.env` (veja `.env.example`):
   ```
   GOOGLE_ADS_DEVELOPER_TOKEN=
   GOOGLE_ADS_CLIENT_ID=
   GOOGLE_ADS_CLIENT_SECRET=
   GOOGLE_ADS_REFRESH_TOKEN=
   GOOGLE_ADS_CUSTOMER_ID=
   GOOGLE_ADS_LOGIN_CUSTOMER_ID=
   ```
6. Rodar a skill `google-ads-api-quickstart` no Claude Code para o primeiro teste de conexão fora do app.
7. Reabrir `/integrations` — assim que as 5 variáveis obrigatórias estiverem presentes, o card muda de "Configuração necessária" para o próximo estado (a chamada real à API ainda precisa ser implementada — veja abaixo).

## O que falta implementar (documentado, não feito hoje)

`lib/adapters/google/read-adapter.ts` já checa a presença das variáveis de ambiente e reporta status em `/integrations` e `/settings`, mas **não faz nenhuma chamada real à Google Ads API ainda** — isso foi deixado como próximo passo intencionalmente, para não configurar/testar credenciais sem sua autorização hoje. Quando as credenciais estiverem prontas:

1. Instalar o client oficial (`google-ads-api` no Node, ou usar o Google Ads MCP Server via `google-ads-api-mcp-setup`).
2. Implementar `listCampaigns()`/`getInsights()` em `GoogleReadAdapter` chamando a API real.
3. Trocar as páginas de Dashboard/Campanhas para usar esses dados no lugar do demo quando `isDemo=false`.

## Segurança

- Nenhuma credencial Google foi configurada ou testada nesta sessão.
- Não existe (e não foi criado) nenhum `GoogleWriteAdapter` real — `DisabledGoogleWriteAdapter` rejeita qualquer chamada de escrita.
