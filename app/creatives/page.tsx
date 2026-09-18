import Link from "next/link";
import { clsx } from "clsx";
import { CreativeLibrary } from "@/components/CreativeLibrary";
import { CreativeUploader } from "@/components/CreativeUploader";
import { PageHeader } from "@/components/ui";
import { prisma } from "@/lib/db";
import { listCreatives } from "@/lib/data/creatives";

export const dynamic = "force-dynamic";

export default async function CreativesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; kind?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const [creatives, categories] = await Promise.all([
    listCreatives({ categoryId: sp.category, kind: sp.kind as "IMAGE" | "VIDEO" | undefined, search: sp.q }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  function hrefFor(overrides: Record<string, string>) {
    const params = new URLSearchParams({ category: sp.category ?? "", kind: sp.kind ?? "", q: sp.q ?? "", ...overrides });
    for (const [k, v] of [...params.entries()]) if (!v) params.delete(k);
    const qs = params.toString();
    return qs ? `/creatives?${qs}` : "/creatives";
  }

  return (
    <div>
      <PageHeader title="Criativos" description="Biblioteca de imagens e vídeos para suas campanhas." />

      <div className="mb-6">
        <CreativeUploader categories={categories} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg border border-border bg-surface p-1">
          {(["", "IMAGE", "VIDEO"] as const).map((k) => (
            <Link
              key={k}
              href={hrefFor({ kind: k })}
              className={clsx(
                "rounded-md px-3 py-1.5 text-sm",
                (sp.kind ?? "") === k ? "bg-accent text-accent-foreground font-medium" : "text-muted hover:text-foreground"
              )}
            >
              {k === "" ? "Todos" : k === "IMAGE" ? "Imagens" : "Vídeos"}
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap gap-1">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={hrefFor({ category: sp.category === c.id ? "" : c.id })}
              className={clsx(
                "rounded-full border px-2.5 py-1 text-xs",
                sp.category === c.id ? "border-accent bg-accent/10 text-accent" : "border-border text-muted hover:text-foreground"
              )}
            >
              {c.name}
            </Link>
          ))}
        </div>

        <form action="/creatives" method="get" className="ml-auto">
          <input type="hidden" name="category" value={sp.category ?? ""} />
          <input type="hidden" name="kind" value={sp.kind ?? ""} />
          <input
            type="search"
            name="q"
            defaultValue={sp.q}
            placeholder="Buscar por nome, produto ou tag..."
            className="w-64 rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </form>
      </div>

      <CreativeLibrary creatives={creatives} categories={categories} />
    </div>
  );
}
