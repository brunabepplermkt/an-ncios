import { Card, PageHeader } from "@/components/ui";
import { metaReadAdapter } from "@/lib/adapters/meta/read-adapter";
import { googleReadAdapter } from "@/lib/adapters/google/read-adapter";
import type { ConnectionState } from "@/lib/adapters/types";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<ConnectionState["status"], { label: string; className: string }> = {
  NOT_CONNECTED: { label: "Não conectado", className: "bg-surface-muted text-muted" },
  CONFIG_REQUIRED: { label: "Configuração necessária", className: "bg-warning-bg text-warning" },
  CONNECTED: { label: "Conectado", className: "bg-success-bg text-success" },
  ERROR: { label: "Erro", className: "bg-critical-bg text-critical" },
};

async function IntegrationCard({
  title,
  state,
  steps,
  docsFile,
  skillsUsed,
}: {
  title: string;
  state: ConnectionState;
  steps: string[];
  docsFile: string;
  skillsUsed: string[];
}) {
  const style = STATUS_STYLE[state.status];
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className={`rounded-md px-2.5 py-1 text-xs font-medium ${style.className}`}>{style.label}</span>
      </div>
      <p className="mt-2 text-sm text-muted">{state.detail}</p>

      <div className="mt-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">O que fazer para conectar</p>
        <ol className="list-decimal space-y-1 pl-4 text-sm">
          {steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted">
        <span>
          Guia completo: <code className="rounded bg-surface-muted px-1">{docsFile}</code>
        </span>
        <span>·</span>
        <span>Skills: {skillsUsed.join(", ")}</span>
      </div>
    </Card>
  );
}

export default async function IntegrationsPage() {
  const [metaState, googleState] = await Promise.all([metaReadAdapter.getConnectionState(), googleReadAdapter.getConnectionState()]);

  return (
    <div>
      <PageHeader title="Integrações" description="Status de conexão com Meta Ads e Google Ads. Tudo em modo leitura." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <IntegrationCard
          title="Meta Ads"
          state={metaState}
          docsFile="docs/META_SETUP.md"
          skillsUsed={["meta-ads-open-cli", "meta-ads-fatigue-monitor", "meta-ads-spend-tracker"]}
          steps={[
            "Criar um app em developers.facebook.com e gerar um Access Token com escopo ads_read.",
            "Definir META_ADS_ACCESS_TOKEN e META_AD_ACCOUNT_ID no arquivo .env.",
            "Rodar `meta-ads-open-cli me` para validar (somente leitura).",
            "Reabrir esta página — o status muda para Conectado automaticamente.",
          ]}
        />
        <IntegrationCard
          title="Google Ads"
          state={googleState}
          docsFile="docs/GOOGLE_SETUP.md"
          skillsUsed={["google-ads-api-mcp-setup", "google-ads-api-quickstart", "google-ads-api-account-diagnostics"]}
          steps={[
            "Solicitar um Developer Token na sua conta Google Ads (MCC).",
            "Criar credenciais OAuth (Client ID/Secret) e gerar um Refresh Token.",
            "Preencher GOOGLE_ADS_* no .env (Customer ID, Login Customer ID se for conta MCC).",
            "Seguir a skill google-ads-api-quickstart para o primeiro teste de conexão.",
          ]}
        />
      </div>

      <Card className="mt-4 p-5">
        <h2 className="text-sm font-semibold">Documentação detalhada</h2>
        <p className="mt-1 text-sm text-muted">
          Os passos completos, com nomes exatos de variáveis e onde obter cada credencial, estão em{" "}
          <code className="rounded bg-surface-muted px-1">docs/META_SETUP.md</code> e{" "}
          <code className="rounded bg-surface-muted px-1">docs/GOOGLE_SETUP.md</code> no repositório.
        </p>
      </Card>
    </div>
  );
}
