# Para amanhã

## META ADS

- [ ] Abrir developers.facebook.com e criar/abrir seu app
- [ ] Gerar Access Token com escopo `ads_read` (+ `pages_read_engagement`, `leads_retrieval` se quiser leads)
- [ ] Anotar seu Ad Account ID (`act_XXXXXXXXX`)
- [ ] Preencher `META_ADS_ACCESS_TOKEN` e `META_AD_ACCOUNT_ID` no `.env`
- [ ] Testar: `meta-ads-open-cli me` e `meta-ads-open-cli ad-accounts`
- [ ] Abrir `/integrations` no app e confirmar card "Conectado"
- [ ] Importar campanhas (próximo passo de código — ver `docs/META_SETUP.md`)
- [ ] Conferir métricas batendo com o Gerenciador de Anúncios da Meta

## GOOGLE ADS

- [ ] Solicitar/confirmar Developer Token na conta Google Ads
- [ ] Criar Client ID + Client Secret (Google Cloud Console)
- [ ] Gerar Refresh Token (skill `google-ads-api-quickstart` ajuda com isso)
- [ ] Anotar Customer ID (e Login Customer ID se for conta MCC)
- [ ] Preencher as 5 variáveis `GOOGLE_ADS_*` no `.env`
- [ ] Rodar a skill `google-ads-api-quickstart` para o teste inicial de conexão
- [ ] Abrir `/integrations` e conferir status
- [ ] Importar campanhas (implementação real ainda não existe no app — ver `docs/GOOGLE_SETUP.md`)

## CRIATIVOS

- [ ] Abrir `/creatives`
- [ ] Enviar suas imagens reais (JPG/PNG/WEBP)
- [ ] Enviar seus vídeos reais (MP4/MOV)
- [ ] Selecionar vários de uma vez e categorizar em lote (Domo Estelar, Mirante, Ágata, Doce Recanto, Celeiro, Sítio Vó Deny, Institucional, Experiências, Promoção)
- [ ] Adicionar tags relevantes
- [ ] Editar categorias em `/settings` se quiser renomear/adicionar novas

## TESTE GERAL

- [ ] Abrir `/dashboard` e conferir os dados (ainda demo até conectar as contas)
- [ ] Comparar Meta x Google no card de Análises ("Como Meta e Google estão se comparando?")
- [ ] Abrir o detalhe de uma campanha em `/campaigns`
- [ ] Rodar uma pergunta em `/analyses` (ex: "Existe fadiga de criativo?")
- [ ] Criar seu primeiro draft real em `/drafts/new` e salvar (sem publicar)
