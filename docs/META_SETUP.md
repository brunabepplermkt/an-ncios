# Conectar Meta Ads (read-only)

O app usa [`meta-ads-open-cli`](https://github.com/Bin-Huang/meta-ads-open-cli) — já instalado globalmente (`npm install -g meta-ads-open-cli`) e validado nesta sessão (`meta-ads-open-cli --help` funcionando, versão 1.0.4). É um CLI **somente leitura** para a Graph API de Marketing da Meta.

## Passo a passo

1. Criar (ou usar) um app em [developers.facebook.com](https://developers.facebook.com/apps/).
2. Gerar um **Access Token** com, no mínimo, o escopo `ads_read`. Para dados de leads/páginas, também `pages_read_engagement` e `leads_retrieval`.
3. Descobrir o **Ad Account ID** (formato `act_XXXXXXXXX` — o app aceita com ou sem o prefixo).
4. Preencher no `.env` (veja `.env.example`):
   ```
   META_ADS_ACCESS_TOKEN=seu_token_aqui
   META_AD_ACCOUNT_ID=act_XXXXXXXXX
   ```
5. Validar manualmente:
   ```bash
   meta-ads-open-cli me
   meta-ads-open-cli ad-accounts
   ```
6. Reabrir `/integrations` no app — o card do Meta deve mudar para **Conectado** automaticamente (`lib/adapters/meta/read-adapter.ts` roda `meta-ads-open-cli me` para validar).

## O que o app já sabe fazer com isso

- `MetaReadAdapter.listCampaigns()` e `.getInsights()` (em `lib/adapters/meta/read-adapter.ts`) já chamam o CLI real. Falta apenas: mapear o array `actions` da Insights API para o campo `conversions` (hoje fixo em 0 — é o próximo passo de integração real, não coberto nesta V1) e ligar essas funções às páginas de Dashboard/Campanhas no lugar dos dados demo.
- As skills `meta-ads-fatigue-monitor` e `meta-ads-spend-tracker` (instaladas globalmente) podem ser usadas para análises pontuais direto no Claude Code enquanto a integração completa não está no app.

## Segurança

- **Nunca** foi configurado nenhum token real nesta sessão.
- O `MetaWriteAdapter` (mutações) está **desabilitado por padrão** (`lib/adapters/disabled-write-adapter.ts`) — mesmo com um token de escrita, o app não publica, pausa ou altera nada até que uma implementação real seja explicitamente construída e autorizada.
- Referência para a futura camada de escrita: [`armavita-meta-ads-mcp`](https://github.com/EfrainTorres/armavita-meta-ads-mcp) foi analisado (é um servidor MCP em Rust com ~125 ferramentas, incluindo mutações). Não foi conectado, nenhum token foi configurado e nenhuma mutação foi habilitada — ele serve apenas como referência de design para quando o `MetaWriteAdapter` for implementado de verdade.
