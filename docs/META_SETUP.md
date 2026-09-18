# Conectar Meta Ads (read-only)

O app usa [`meta-ads-open-cli`](https://github.com/Bin-Huang/meta-ads-open-cli) — instalado globalmente (`npm install -g meta-ads-open-cli`) e validado nesta sessão (`meta-ads-open-cli --help`, versão 1.0.4). É um CLI **somente leitura** para a Graph API de Marketing da Meta (v24.0). `lib/adapters/meta/read-adapter.ts` foi escrito e verificado contra o código-fonte instalado da CLI (não são nomes de campo inventados).

## Passo a passo

1. Criar (ou usar) um app em [developers.facebook.com](https://developers.facebook.com/apps/).
2. Gerar um **Access Token** com, no mínimo, o escopo `ads_read`. Para dados de leads/páginas, também `pages_read_engagement` e `leads_retrieval`.
3. Preencher no `.env` (veja `.env.example`):
   ```
   META_ADS_ACCESS_TOKEN=seu_token_aqui
   ```
   `META_AD_ACCOUNT_ID` é **opcional** — se você já sabe o ID (`act_XXXXXXXXX`), pode preenchê-lo aqui para pular a etapa de seleção. Se deixar em branco, você escolhe a conta pela interface (passo 5).
4. Abrir `/integrations` no app.
5. No card **Meta Ads**:
   - Clique em **Testar conexão** — isso roda `meta-ads-open-cli me` e `ad-accounts` (somente leitura) e lista as contas às quais o token tem acesso.
   - Selecione a conta na lista e clique em **Usar esta conta**. O ID da conta (não é um segredo) fica salvo no banco local do app; o token nunca sai do `.env`/servidor.
   - Clique em **Sincronizar agora** para importar campanhas e métricas diárias dos últimos 30 dias.

## O que a sincronização faz

- Lista campanhas (`campaigns`) e, para cada uma, busca insights diários (`insights`/`insights-date`) — nunca chama nenhum comando de escrita (o CLI, aliás, não expõe nenhum).
- Mapeia `actions`/`conversions`/`conversion_values` da Insights API para `conversions`/`revenue` (somando os valores desses arrays).
- Grava campanhas como **dados reais** (`isDemo=false`) — os dados demo continuam no banco, só ficam ocultos assim que existir pelo menos uma campanha real para a plataforma (ver `docs/ARCHITECTURE.md`, seção "Modo DEMO/REAL").
- Depois de importar métricas, tenta vincular (somente leitura, por nome) criativos já existentes na sua conta Meta aos criativos da sua biblioteca — nunca baixa nem duplica o arquivo, nunca altera o anúncio original. Card mostra "N criativo(s) vinculados" ao final.
- Registra cada tentativa (sucesso ou erro) em um histórico visível no card ("Histórico de sincronizações").
- Tem um cooldown de 30s entre sincronizações e 3s entre testes de conexão, para não martelar a API por engano.

## Validando os números

Depois de sincronizar, use `/integrations/diagnostics` para comparar, campanha a campanha e dia a dia, o valor armazenado no banco com o valor buscado ao vivo da Meta agora, e para conferir CTR/CPC/CPM/CPA/ROAS calculados contra um recálculo independente. Nenhum valor é arredondado antes da comparação.

## Segurança

- **Nunca** foi configurado nenhum token real nesta sessão.
- O token só existe como variável de ambiente no servidor — nunca é enviado ao navegador, nunca é salvo no banco, nunca aparece em log.
- O `MetaWriteAdapter` (mutações) está **desabilitado por padrão** (`lib/adapters/disabled-write-adapter.ts`) — mesmo com um token de escrita, o app não publica, pausa ou altera nada até que uma implementação real seja explicitamente construída e autorizada.
- Referência para a futura camada de escrita: [`armavita-meta-ads-mcp`](https://github.com/EfrainTorres/armavita-meta-ads-mcp) foi analisado (servidor MCP em Rust com ~125 ferramentas, incluindo mutações). Não foi conectado, nenhum token foi configurado e nenhuma mutação foi habilitada — serve apenas como referência de design para quando o `MetaWriteAdapter` for implementado de verdade, com sua autorização explícita.
