"use client";

import { clsx } from "clsx";
import type { CreativeListItem } from "@/lib/data/creatives";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const DEMO_GRADIENTS = [
  "from-indigo-500 to-blue-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-500",
  "from-violet-500 to-purple-500",
  "from-cyan-500 to-sky-500",
];

function gradientFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return DEMO_GRADIENTS[h % DEMO_GRADIENTS.length];
}

export function CreativePreview({ creative, className }: { creative: Pick<CreativeListItem, "id" | "storageKey" | "kind" | "mimeType" | "product" | "fileName" | "isDemo">; className?: string }) {
  if (creative.isDemo) {
    return (
      <div className={clsx("relative flex items-center justify-center overflow-hidden bg-gradient-to-br text-white", gradientFor(creative.id), className)}>
        <div className="text-center px-2">
          {creative.kind === "VIDEO" && (
            <svg viewBox="0 0 24 24" fill="currentColor" className="mx-auto mb-1 h-6 w-6 opacity-90">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
          <p className="text-xs font-medium leading-tight opacity-95">{creative.product ?? creative.fileName}</p>
        </div>
        <span className="absolute top-1.5 right-1.5 rounded bg-black/30 px-1.5 py-0.5 text-[10px] font-medium">DEMO</span>
      </div>
    );
  }

  const url = `/api/files/${encodeURIComponent(creative.storageKey)}`;
  if (creative.kind === "IMAGE") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={creative.fileName} className={clsx("object-cover", className)} />;
  }
  return <video src={url} className={clsx("object-cover", className)} muted controls={false} />;
}

export function CreativeCard({
  creative,
  selected,
  onToggle,
}: {
  creative: CreativeListItem;
  selected: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <div className={clsx("group rounded-lg border bg-surface overflow-hidden transition-shadow", selected ? "border-accent ring-1 ring-accent" : "border-border")}>
      <div className="relative aspect-[4/5] bg-surface-muted">
        <CreativePreview creative={creative} className="h-full w-full" />
        <label className="absolute top-2 left-2 flex h-5 w-5 items-center justify-center rounded border border-white/70 bg-black/30 backdrop-blur cursor-pointer">
          <input type="checkbox" checked={selected} onChange={() => onToggle(creative.id)} className="h-3.5 w-3.5" />
        </label>
        {creative.kind === "VIDEO" && creative.durationSeconds && (
          <span className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
            {Math.round(creative.durationSeconds)}s
          </span>
        )}
      </div>
      <div className="p-2.5">
        <p className="truncate text-xs font-medium" title={creative.fileName}>
          {creative.fileName}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px] text-muted">
          {creative.categoryName && <span className="rounded bg-surface-muted px-1.5 py-0.5">{creative.categoryName}</span>}
          <span>{formatBytes(creative.sizeBytes)}</span>
          {creative.width && creative.height && (
            <span>
              {creative.width}×{creative.height}
            </span>
          )}
        </div>
        {creative.tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {creative.tags.map((t) => (
              <span key={t} className="rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] text-accent">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
