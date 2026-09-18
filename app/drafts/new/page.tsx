import { DraftWizard } from "@/components/DraftWizard";
import { PageHeader } from "@/components/ui";
import { listCreatives } from "@/lib/data/creatives";

export const dynamic = "force-dynamic";

export default async function NewDraftPage() {
  const creatives = await listCreatives();
  return (
    <div>
      <PageHeader title="Nova campanha (draft)" description="Monte a campanha por etapas. Nada é publicado — apenas salvo como rascunho." />
      <DraftWizard creatives={creatives} />
    </div>
  );
}
