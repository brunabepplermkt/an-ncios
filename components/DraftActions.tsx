"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

export function DraftActions({ id }: { id: string }) {
  const router = useRouter();

  async function duplicate() {
    await fetch(`/api/drafts/${id}/duplicate`, { method: "POST" });
    router.refresh();
  }

  async function remove() {
    if (!confirm("Excluir este draft? Esta ação não pode ser desfeita.")) return;
    await fetch(`/api/drafts/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <Link href={`/drafts/${id}`} className="text-accent hover:underline">
        Editar
      </Link>
      <button onClick={duplicate} className="text-muted hover:text-foreground">
        Duplicar
      </button>
      <button onClick={remove} className="text-muted hover:text-critical">
        Excluir
      </button>
    </div>
  );
}
