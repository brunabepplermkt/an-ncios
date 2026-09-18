# Para amanhã

## META ADS

- [ ] Abrir developers.facebook.com e criar/abrir seu app
- [ ] Gerar Access Token com escopo `ads_read` (+ `pages_read_engagement`, `leads_retrieval` se quiser leads)
- [ ] Colar o token em `META_ADS_ACCESS_TOKEN` no `.env` (reiniciar o app depois de editar o `.env`)
- [ ] Abrir `/integrations` → card Meta Ads → **Testar conexão**
- [ ] Selecionar a conta na lista que aparecer → **Usar esta conta**
- [ ] Clicar em **Sincronizar agora**
- [ ] Conferir "N campanha(s) importadas" e o período na mensagem de sucesso
- [ ] Abrir `/integrations/diagnostics` e validar 1-2 campanhas (valor armazenado vs. ao vivo)

## GOOGLE ADS

- [ ] Solicitar/confirmar Developer Token na conta Google Ads
- [ ] Criar Client ID + Client Secret (Google Cloud Console)
- [ ] Gerar Refresh Token (skill `google-ads-api-quickstart` ajuda com isso)
- [ ] Preencher `GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`, `GOOGLE_ADS_REFRESH_TOKEN` no `.env`
- [ ] Se a conta for acessada via agência (MCC), anotar o Login Customer ID
- [ ] Abrir `/integrations` → card Google Ads → preencher Login Customer ID (se aplicável) → **Testar conexão**
- [ ] Selecionar o Customer ID na lista → **Usar esta conta**
- [ ] Clicar em **Sincronizar agora**
- [ ] Se der erro, checar a versão da API (`GOOGLE_ADS_API_VERSION` no `.env` — ver `docs/GOOGLE_SETUP.md`)

## CRIATIVOS

- [ ] Abrir `/creatives`
- [ ] Enviar suas imagens reais (JPG/PNG/WEBP, até 25MB cada)
- [ ] Enviar seus vídeos reais (MP4/MOV, até 300MB cada)
- [ ] Selecionar vários de uma vez (até 60 por envio) e categorizar em lote
- [ ] Adicionar tags e acomodação/produto em lote
- [ ] Depois de sincronizar a Meta, conferir quais criativos ganharam o selo "Meta ✓" (vínculo automático por nome)
- [ ] Editar categorias em `/settings` se quiser renomear/adicionar novas

## TESTE GERAL

- [ ] Abrir `/dashboard` e conferir os selos Meta/Google (DEMO até você sincronizar, "dados reais" depois)
- [ ] Testar os filtros: hoje, ontem, 7/14/30 dias, este mês, mês passado, personalizado
- [ ] Comparar Meta x Google em `/analyses` ("Como Meta e Google estão se comparando?")
- [ ] Abrir o detalhe de uma campanha real em `/campaigns`
- [ ] Rodar uma pergunta em `/analyses` sobre os dados reais (ex: "O que piorou nos últimos 7 dias?")
- [ ] Criar seu primeiro draft real em `/drafts/new` e salvar (o botão "Publicar" fica sempre desabilitado nesta versão)
