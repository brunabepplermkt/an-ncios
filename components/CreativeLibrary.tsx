"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreativeCard } from "./CreativeCard";
import type { CreativeListItem } from "@/lib/data/creatives";

export function CreativeLibrary({
  creatives,
  categories,
}: {
  creatives: CreativeListItem[];
  categories: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkTags, setBulkTags] = useState("");
  const [saving, setSaving] = useState(false);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function applyBulk() {
    setSaving(true);
    try {
      const body: Record<string, unknown> = { ids: Array.from(selected) };
      if (bulkCategory) body.categoryId = bulkCategory;
      if (bulkTags) body.tags = bulkTags.split(",").map((t) => t.trim()).filter(Boolean);
      await fetch("/api/creatives", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      setSelected(new Set());
      setBulkCategory("");
      setBulkTags("");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (creatives.length === 0) {
    return <p className="rounded-lg border border-border bg-surface p-10 text-center text-sm text-muted">Nenhum criativo encontrado para este filtro.</p>;
  }

  return (
    <div>
      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-accent bg-accent/5 p-3">
          <span className="text-sm font-medium">{selected.size} selecionado(s)</span>
          <select
            value={bulkCategory}
            onChange={(e) => setBulkCategory(e.target.value)}
            className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
          >
            <option value="">Categoria...</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            value={bulkTags}
            onChange={(e) => setBulkTags(e.target.value)}
            placeholder="Tags (vírgula)"
            className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
          />
          <button onClick={applyBulk} disabled={saving} className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground disabled:opacity-50">
            {saving ? "Salvando..." : "Aplicar"}
          </button>
          <button onClick={() => setSelected(new Set())} className="text-sm text-muted hover:text-foreground">
            Cancelar
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {creatives.map((c) => (
          <CreativeCard key={c.id} creative={c} selected={selected.has(c.id)} onToggle={toggle} />
        ))}
      </div>
    </div>
  );
}
