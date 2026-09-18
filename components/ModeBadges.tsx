import type { DataMode } from "@/lib/data/mode";

function Pill({ platform, mode }: { platform: "Meta" | "Google"; mode: DataMode }) {
  const isDemo = mode === "DEMO";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        isDemo ? "bg-demo-bg text-demo" : "bg-success-bg text-success"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isDemo ? "bg-demo" : "bg-success"}`} />
      {platform}: {isDemo ? "DEMO" : "dados reais"}
    </span>
  );
}

export function ModeBadges({ modes }: { modes: Record<"META" | "GOOGLE", DataMode> }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Pill platform="Meta" mode={modes.META} />
      <Pill platform="Google" mode={modes.GOOGLE} />
    </div>
  );
}
