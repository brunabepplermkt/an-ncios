import Link from "next/link";
import { CategoryManager } from "@/components/CategoryManager";
import { SettingsForm } from "@/components/SettingsForm";
import { Card, PageHeader } from "@/components/ui";
import { metaReadAdapter } from "@/lib/adapters/meta/read-adapter";
import { googleReadAdapter } from "@/lib/adapters/google/read-adapter";
import { prisma } from "@/lib/db";
import { getAIProvider } from "@/lib/ai";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [settings, categories, metaState, googleState] = await Promise.all([
    getSettings(),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    metaReadAdapter.getConnectionState(),
    googleReadAdapter.getConnectionState(),
  ]);
  const ai = getAIProvider();

  return (
    <div className="space-y-6">
      <PageHeader title="Configurações" description="Preferências gerais, categorias de criativos, IA e status de anúncios." />

      <Card className="p-5">
        <h2 className="mb-1 text-sm font-semibold">Negócio</h2>
        <p className="mb-4 text-xs text-muted">Usado para formatar valores e datas no app.</p>
        <SettingsForm initial={{ businessName: settings.businessName, currency: settings.currency, timezone: settings.timezone }} />
      </Card>

      <Card className="p-5">
        <h2 className="mb-1 text-sm font-semibold">Categorias de criativos</h2>
        <p className="mb-4 text-xs text-muted">Usadas na Biblioteca de Criativos para organizar imagens e vídeos.</p>
        <CategoryManager categories={categories} />
      </Card>

      <Card className="p-5">
        <h2 className="mb-1 text-sm font-semibold">IA</h2>
        <p className="mb-3 text-xs text-muted">Provider usado na página Análises.</p>
        <div className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
          <span>Provider ativo: <strong>{ai.name}</strong></span>
          <span className="rounded-md bg-demo-bg px-2 py-0.5 text-xs text-demo">Sem chave configurada — respostas geradas por regras locais</span>
        </div>
        <p className="mt-2 text-xs text-muted">
          Para usar OpenAI ou Anthropic, defina <code className="rounded bg-surface-muted px-1">AI_PROVIDER</code> e a chave correspondente no{" "}
          <code className="rounded bg-surface-muted px-1">.env</code> (ver <code className="rounded bg-surface-muted px-1">lib/ai/index.ts</code>).
        </p>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold">Anúncios</h2>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
            <span>Meta Ads</span>
            <span className="text-xs text-muted">{metaState.status === "CONNECTED" ? "Conectado" : "Não conectado"}</span>
          </div>
          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
            <span>Google Ads</span>
            <span className="text-xs text-muted">{googleState.status === "CONNECTED" ? "Conectado" : "Não conectado"}</span>
          </div>
        </div>
        <Link href="/integrations" className="mt-3 inline-block text-sm text-accent hover:underline">
          Ver detalhes em Integrações →
        </Link>
      </Card>
    </div>
  );
}
