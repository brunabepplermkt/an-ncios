"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CategoryManager({ categories }: { categories: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!newName.trim()) return;
    setBusy(true);
    await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newName }) });
    setNewName("");
    setBusy(false);
    router.refresh();
  }

  async function rename(id: string) {
    if (!editValue.trim()) return;
    setBusy(true);
    await fetch(`/api/categories/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: editValue }) });
    setEditingId(null);
    setBusy(false);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Excluir esta categoria? Criativos vinculados ficarão sem categoria.")) return;
    setBusy(true);
    await fetch(`/api/categories/${id}`, { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }

  return (
    <div>
      <ul className="mb-4 divide-y divide-border rounded-md border border-border">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2">
            {editingId === c.id ? (
              <input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                autoFocus
                className="flex-1 rounded-md border border-border bg-surface px-2 py-1 text-sm"
              />
            ) : (
              <span className="text-sm">{c.name}</span>
            )}
            <div className="flex items-center gap-3 text-xs">
              {editingId === c.id ? (
                <>
                  <button disabled={busy} onClick={() => rename(c.id)} className="text-accent">
                    Salvar
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-muted">
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setEditingId(c.id);
                      setEditValue(c.name);
                    }}
                    className="text-muted hover:text-foreground"
                  >
                    Editar
                  </button>
                  <button disabled={busy} onClick={() => remove(c.id)} className="text-muted hover:text-critical">
                    Excluir
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
        {categories.length === 0 && <li className="px-3 py-4 text-sm text-muted">Nenhuma categoria.</li>}
      </ul>

      <div className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nova categoria..."
          className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button onClick={create} disabled={busy} className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50">
          Adicionar
        </button>
      </div>
    </div>
  );
}
