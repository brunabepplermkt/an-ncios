import { Card, PageHeader } from "@/components/ui";
import { IntegrationPanel } from "@/components/IntegrationPanel";
import { getRecentSyncLogs, resolveGoogleStatus, resolveMetaStatus } from "@/lib/integrations";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const [metaSummary, googleSummary, metaLogs, googleLogs] = await Promise.all([
    resolveMetaStatus(),
    resolveGoogleStatus(),
    getRecentSyncLogs("META"),
    getRecentSyncLogs("GOOGLE"),
  ]);

  return (
    <div>
      <PageHeader title="Integrações" description="Conecte Meta Ads e Google Ads em modo leitura. Sincronização é sempre manual." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <IntegrationPanel
          platform="META"
          title="Meta Ads"
          summary={serialize(metaSummary)}
          recentLogs={metaLogs.map(serializeLog)}
          testEndpoint="/api/integrations/meta/test"
          selectEndpoint="/api/integrations/meta/select-account"
          syncEndpoint="/api/integrations/meta/sync"
          accountFieldLabel="Conta de anúncios"
          setupSteps={[
            "Criar um app em developers.facebook.com e gerar um Access Token com escopo ads_read.",
            "Definir META_ADS_ACCESS_TOKEN no arquivo .env (nunca no navegador).",
            "Clicar em Testar conexão abaixo — isso lista as contas de anúncios acessíveis pelo token.",
            "Selecionar a conta e clicar em Sincronizar agora para importar campanhas e métricas.",
          ]}
        />
        <IntegrationPanel
          platform="GOOGLE"
          title="Google Ads"
          summary={serialize(googleSummary)}
          recentLogs={googleLogs.map(serializeLog)}
          testEndpoint="/api/integrations/google/test"
          selectEndpoint="/api/integrations/google/select-account"
          syncEndpoint="/api/integrations/google/sync"
          accountFieldLabel="Customer ID"
          showLoginCustomerId
          setupSteps={[
            "Solicitar um Developer Token na conta Google Ads (MCC).",
            "Criar credenciais OAuth (Client ID/Secret) e gerar um Refresh Token.",
            "Preencher GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET e GOOGLE_ADS_REFRESH_TOKEN no .env.",
            "Se acessar via conta de agência (MCC), informe o Login Customer ID abaixo antes de testar.",
            "Clicar em Testar conexão, selecionar o Customer ID e Sincronizar agora.",
          ]}
        />
      </div>

      <Card className="mt-4 p-5">
        <h2 className="text-sm font-semibold">Documentação detalhada</h2>
        <p className="mt-1 text-sm text-muted">
          Passo a passo completo (onde obter cada credencial, nomes exatos de variáveis) em{" "}
          <code className="rounded bg-surface-muted px-1">docs/META_SETUP.md</code> e{" "}
          <code className="rounded bg-surface-muted px-1">docs/GOOGLE_SETUP.md</code>. Ferramenta de validação dos números importados em{" "}
          <code className="rounded bg-surface-muted px-1">/integrations/diagnostics</code>.
        </p>
      </Card>
    </div>
  );
}

function serialize(s: Awaited<ReturnType<typeof resolveMetaStatus>>) {
  return {
    status: s.status,
    detail: s.detail,
    accountId: s.accountId,
    accountName: s.accountName,
    lastSyncedAt: s.lastSyncedAt ? s.lastSyncedAt.toISOString() : null,
    lastSyncCampaigns: s.lastSyncCampaigns,
    lastSyncPeriodStart: s.lastSyncPeriodStart ? s.lastSyncPeriodStart.toISOString() : null,
    lastSyncPeriodEnd: s.lastSyncPeriodEnd ? s.lastSyncPeriodEnd.toISOString() : null,
  };
}

function serializeLog(log: Awaited<ReturnType<typeof getRecentSyncLogs>>[number]) {
  return {
    id: log.id,
    status: log.status,
    message: log.message,
    campaignsImported: log.campaignsImported,
    createdAt: log.createdAt.toISOString(),
  };
}
