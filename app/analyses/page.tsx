import { AnalysesPanel } from "@/components/AnalysesPanel";
import { DemoBadge, PageHeader } from "@/components/ui";

export default function AnalysesPage() {
  return (
    <div>
      <PageHeader
        title="Análises"
        description="Pergunte sobre suas campanhas. As respostas usam o provider de IA configurado em Configurações."
        actions={<DemoBadge label="IA MOCK" />}
      />
      <AnalysesPanel />
    </div>
  );
}
