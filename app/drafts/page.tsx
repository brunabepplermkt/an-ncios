import Link from "next/link";
import { DraftActions } from "@/components/DraftActions";
import { Card, PageHeader, PlatformBadge } from "@/components/ui";
import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/metrics/calc";
import { getSettings } from "@/lib/settings";
import { safeParseTags } from "@/lib/data/creatives";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  INCOMPLETE: "Incompleto",
  READY_FOR_REVIEW: "Pronto para revisão",
  APPROVED: "Aprovado",
  WAITING_CONNECTION: "Aguardando conexão",
};

export default async function DraftsPage() {
  const [drafts, settings] = await Promise.all([prisma.draft.findMany({ orderBy: { updatedAt: "desc" } }), getSettings()]);

  return (
    <div>
      <PageHeader
        title="Drafts"
        description="Campanhas montadas no sistema, ainda não publicadas."
        actions={
          <Link href="/drafts/new" className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground">
            + Nova campanha
          </Link>
        }
      />

      {drafts.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-sm">Nenhum draft ainda.</p>
          <Link href="/drafts/new" className="mt-2 inline-block text-sm text-accent hover:underline">
            Criar a primeira campanha
          </Link>
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted">
                <th className="px-4 py-3 font-medium">Plataforma</th>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Objetivo</th>
                <th className="px-4 py-3 text-right font-medium">Orçamento</th>
                <th className="px-4 py-3 text-right font-medium">Criativos</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Atualizado</th>
                <th className="px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {drafts.map((d) => (
                <tr key={d.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <PlatformBadge platform={d.platform} />
                  </td>
                  <td className="px-4 py-3 font-medium">{d.name}</td>
                  <td className="px-4 py-3 text-muted">{d.objective || "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{d.budget ? formatCurrency(d.budget, settings.currency) : "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{safeParseTags(d.creativeIds).length}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-surface-muted px-2 py-0.5 text-xs">{STATUS_LABEL[d.status] ?? d.status}</span>
                  </td>
                  <td className="px-4 py-3 text-muted">{d.updatedAt.toLocaleDateString("pt-BR")}</td>
                  <td className="px-4 py-3">
                    <DraftActions id={d.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
