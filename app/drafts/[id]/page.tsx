import { notFound } from "next/navigation";
import { DraftWizard } from "@/components/DraftWizard";
import { PageHeader } from "@/components/ui";
import { prisma } from "@/lib/db";
import { listCreatives, safeParseTags } from "@/lib/data/creatives";

export const dynamic = "force-dynamic";

export default async function EditDraftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [draft, creatives] = await Promise.all([prisma.draft.findUnique({ where: { id } }), listCreatives()]);
  if (!draft) notFound();

  return (
    <div>
      <PageHeader title={`Editar draft — ${draft.name}`} description="Alterações ficam salvas apenas como rascunho." />
      <DraftWizard
        draftId={draft.id}
        creatives={creatives}
        initial={{
          platform: draft.platform,
          name: draft.name,
          objective: draft.objective ?? "",
          product: draft.product ?? "",
          budget: draft.budget?.toString() ?? "",
          location: draft.location ?? "",
          audience: draft.audience ?? "",
          landingPage: draft.landingPage ?? "",
          headline: draft.headline ?? "",
          primaryText: draft.primaryText ?? "",
          cta: draft.cta ?? "Saiba mais",
          keywords: safeParseTags(draft.keywords).join("\n"),
          headlines: safeParseTags(draft.headlines).join("\n"),
          descriptions: safeParseTags(draft.descriptions).join("\n"),
          creativeIds: safeParseTags(draft.creativeIds),
        }}
      />
    </div>
  );
}
