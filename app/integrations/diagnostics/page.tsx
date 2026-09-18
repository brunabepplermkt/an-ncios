import Link from "next/link";
import { DiagnosticsPanel } from "@/components/DiagnosticsPanel";
import { Card, PageHeader } from "@/components/ui";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DiagnosticsPage() {
  const campaigns = await prisma.campaign.findMany({
    where: { isDemo: false },
    select: { id: true, name: true, platform: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <Link href="/integrations" className="text-sm text-muted hover:text-foreground">
        ← Integrações
      </Link>
      <PageHeader
        title="Diagnóstico de dados"
        description="Compara o valor bruto armazenado com o valor buscado ao vivo do provedor, e verifica o cálculo de CTR/CPC/CPM/CPA/ROAS com uma implementação independente. Nenhum valor é arredondado antes da comparação."
      />

      <Card className="p-5">
        <DiagnosticsPanel campaigns={campaigns} />
      </Card>
    </div>
  );
}
