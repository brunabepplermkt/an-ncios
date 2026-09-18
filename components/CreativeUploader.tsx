"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface PendingFile {
  file: File;
  previewUrl: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
}

const ACCEPT = ".jpg,.jpeg,.png,.webp,.mp4,.mov,image/jpeg,image/png,image/webp,video/mp4,video/quicktime";

async function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = url;
  });
}

async function readVideoMeta(file: File): Promise<{ width: number; height: number; durationSeconds: number }> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      resolve({ width: video.videoWidth, height: video.videoHeight, durationSeconds: video.duration });
      URL.revokeObjectURL(url);
    };
    video.onerror = () => resolve({ width: 0, height: 0, durationSeconds: 0 });
    video.src = url;
  });
}

export function CreativeUploader({ categories }: { categories: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [product, setProduct] = useState("");
  const [tags, setTags] = useState("");
  const [note, setNote] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function addFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    const next: PendingFile[] = [];
    for (const file of files) {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      if (!isImage && !isVideo) continue;
      const previewUrl = URL.createObjectURL(file);
      if (isImage) {
        const dim = await readImageDimensions(file);
        next.push({ file, previewUrl, ...dim });
      } else {
        const meta = await readVideoMeta(file);
        next.push({ file, previewUrl, ...meta });
      }
    }
    setPending((prev) => [...prev, ...next]);
  }

  function removePending(index: number) {
    setPending((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (pending.length === 0) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const form = new FormData();
      for (const p of pending) form.append("files", p.file);
      form.append(
        "meta",
        JSON.stringify(pending.map((p) => ({ width: p.width || undefined, height: p.height || undefined, durationSeconds: p.durationSeconds || undefined })))
      );
      if (categoryId) form.append("categoryId", categoryId);
      if (product) form.append("product", product);
      if (tags) form.append("tags", tags);
      if (note) form.append("note", note);

      const res = await fetch("/api/creatives", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha no upload.");

      setMessage(`${data.created} criativo(s) enviados com sucesso.`);
      setPending([]);
      setProduct("");
      setTags("");
      setNote("");
      setCategoryId("");
      router.refresh();
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed p-8 text-center transition-colors ${
          dragOver ? "border-accent bg-accent/5" : "border-border"
        }`}
      >
        <p className="text-sm font-medium">Arraste imagens/vídeos aqui ou clique para selecionar</p>
        <p className="mt-1 text-xs text-muted">JPG, JPEG, PNG, WEBP · MP4, MOV — múltiplos arquivos de uma vez</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
      </div>

      {pending.length > 0 && (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            {pending.map((p, i) => (
              <div key={i} className="relative h-20 w-20 overflow-hidden rounded-md border border-border">
                {p.file.type.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.previewUrl} alt={p.file.name} className="h-full w-full object-cover" />
                ) : (
                  <video src={p.previewUrl} className="h-full w-full object-cover" muted />
                )}
                <button
                  onClick={() => removePending(i)}
                  className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-[10px] text-white"
                  aria-label="Remover"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted">Categoria</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
              >
                <option value="">Sem categoria</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted">Acomodação / produto</label>
              <input
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                placeholder="Ex: Domo Estelar"
                className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted">Tags (separadas por vírgula)</label>
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="pôr do sol, externa"
                className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted">Observação</label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
            >
              {submitting ? "Enviando..." : `Salvar ${pending.length} criativo(s)`}
            </button>
            {message && <p className="text-sm text-muted">{message}</p>}
          </div>
        </>
      )}
    </div>
  );
}
