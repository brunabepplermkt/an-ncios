"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { CreativePreview } from "./CreativeCard";
import type { CreativeListItem } from "@/lib/data/creatives";

export interface DraftFormState {
  platform: "META" | "GOOGLE";
  name: string;
  objective: string;
  product: string;
  budget: string;
  location: string;
  audience: string;
  creativeIds: string[];
  headline: string;
  primaryText: string;
  cta: string;
  landingPage: string;
  keywords: string; // newline-separated in the UI
  headlines: string; // newline-separated
  descriptions: string; // newline-separated
}

const EMPTY: DraftFormState = {
  platform: "META",
  name: "",
  objective: "",
  product: "",
  budget: "",
  location: "",
  audience: "",
  creativeIds: [],
  headline: "",
  primaryText: "",
  cta: "Saiba mais",
  landingPage: "",
  keywords: "",
  headlines: "",
  descriptions: "",
};

const META_STEPS = ["Objetivo", "Acomodação/produto", "Orçamento", "Localização", "Público", "Criativos", "Texto e título", "CTA", "Revisão"];
const GOOGLE_STEPS = ["Objetivo", "Acomodação/produto", "Orçamento", "Localização", "Landing page", "Keywords", "Títulos", "Descrições", "Revisão"];

const META_OBJECTIVES = ["Conversões", "Tráfego", "Reconhecimento de marca", "Engajamento", "Geração de leads"];
const GOOGLE_OBJECTIVES = ["Leads", "Vendas", "Tráfego no site", "Reconhecimento de marca"];
const CTAS = ["Saiba mais", "Reserve agora", "Fale conosco", "Compre agora", "Cadastre-se"];

function computeStatus(state: DraftFormState): string {
  const requiredMeta = [state.objective, state.product, state.budget, state.headline, state.primaryText];
  const requiredGoogle = [state.objective, state.product, state.budget, state.landingPage, state.keywords];
  const required = state.platform === "META" ? requiredMeta : requiredGoogle;
  const filled = required.filter((v) => v.trim().length > 0).length;
  if (filled === 0) return "INCOMPLETE";
  if (filled < required.length) return "INCOMPLETE";
  return "READY_FOR_REVIEW";
}

export function DraftWizard({
  initial,
  draftId,
  creatives,
}: {
  initial?: Partial<DraftFormState>;
  draftId?: string;
  creatives: CreativeListItem[];
}) {
  const router = useRouter();
  const [state, setState] = useState<DraftFormState>({ ...EMPTY, ...initial });
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const steps = state.platform === "META" ? META_STEPS : GOOGLE_STEPS;

  function update<K extends keyof DraftFormState>(key: K, value: DraftFormState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  function toggleCreative(id: string) {
    setState((s) => ({
      ...s,
      creativeIds: s.creativeIds.includes(id) ? s.creativeIds.filter((c) => c !== id) : [...s.creativeIds, id],
    }));
  }

  async function saveDraft() {
    setSaving(true);
    setSavedMessage(null);
    try {
      const payload = {
        platform: state.platform,
        name: state.name || `${state.platform === "META" ? "Meta" : "Google"} • ${state.product || "Campanha"}`,
        objective: state.objective,
        product: state.product,
        budget: state.budget,
        location: state.location,
        audience: state.audience,
        landingPage: state.landingPage,
        headline: state.headline,
        primaryText: state.primaryText,
        cta: state.cta,
        keywords: state.keywords.split("\n").map((k) => k.trim()).filter(Boolean),
        headlines: state.headlines.split("\n").map((k) => k.trim()).filter(Boolean),
        descriptions: state.descriptions.split("\n").map((k) => k.trim()).filter(Boolean),
        creativeIds: state.creativeIds,
        status: computeStatus(state),
      };

      const res = await fetch(draftId ? `/api/drafts/${draftId}` : "/api/drafts", {
        method: draftId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Falha ao salvar draft.");
      setSavedMessage("Draft salvo. Nada foi publicado.");
      router.push("/drafts");
      router.refresh();
    } catch (err) {
      setSavedMessage((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const stepLabel = steps[step];

  return (
    <div>
      {!draftId && (
        <div className="mb-6 flex gap-1 rounded-lg border border-border bg-surface p-1 w-fit">
          {(["META", "GOOGLE"] as const).map((p) => (
            <button
              key={p}
              onClick={() => {
                update("platform", p);
                setStep(0);
              }}
              className={clsx(
                "rounded-md px-4 py-1.5 text-sm",
                state.platform === p ? "bg-accent text-accent-foreground font-medium" : "text-muted hover:text-foreground"
              )}
            >
              {p === "META" ? "Meta Ads" : "Google Ads"}
            </button>
          ))}
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {steps.map((s, i) => (
          <button
            key={s}
            onClick={() => setStep(i)}
            className={clsx(
              "rounded-full px-3 py-1 text-xs border",
              i === step ? "border-accent bg-accent/10 text-accent font-medium" : "border-border text-muted hover:text-foreground"
            )}
          >
            {i + 1}. {s}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-4 text-sm font-semibold">{stepLabel}</h2>

        {stepLabel === "Objetivo" && (
          <Field label="Objetivo da campanha">
            <select value={state.objective} onChange={(e) => update("objective", e.target.value)} className={inputClass}>
              <option value="">Selecione...</option>
              {(state.platform === "META" ? META_OBJECTIVES : GOOGLE_OBJECTIVES).map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </Field>
        )}

        {stepLabel === "Acomodação/produto" && (
          <Field label="Acomodação / produto anunciado">
            <input value={state.product} onChange={(e) => update("product", e.target.value)} placeholder="Ex: Domo Estelar" className={inputClass} />
          </Field>
        )}

        {stepLabel === "Orçamento" && (
          <Field label="Orçamento diário (R$)">
            <input type="number" min="0" value={state.budget} onChange={(e) => update("budget", e.target.value)} className={inputClass} />
          </Field>
        )}

        {stepLabel === "Localização" && (
          <Field label="Localização">
            <input value={state.location} onChange={(e) => update("location", e.target.value)} placeholder="Ex: Raio de 100km — Campos do Jordão, SP" className={inputClass} />
          </Field>
        )}

        {stepLabel === "Público" && (
          <Field label="Público-alvo">
            <textarea value={state.audience} onChange={(e) => update("audience", e.target.value)} rows={3} placeholder="Ex: Casais 25-45 anos, interesse em turismo rural" className={inputClass} />
          </Field>
        )}

        {stepLabel === "Landing page" && (
          <Field label="URL da landing page">
            <input value={state.landingPage} onChange={(e) => update("landingPage", e.target.value)} placeholder="https://..." className={inputClass} />
          </Field>
        )}

        {stepLabel === "Criativos" && (
          <div>
            <p className="mb-3 text-xs text-muted">Selecione os criativos da sua biblioteca para esta campanha.</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
              {creatives.map((c) => (
                <button
                  key={c.id}
                  onClick={() => toggleCreative(c.id)}
                  className={clsx("aspect-[4/5] overflow-hidden rounded-md border-2", state.creativeIds.includes(c.id) ? "border-accent" : "border-transparent")}
                >
                  <CreativePreview creative={c} className="h-full w-full" />
                </button>
              ))}
              {creatives.length === 0 && <p className="col-span-full text-sm text-muted">Nenhum criativo na biblioteca ainda.</p>}
            </div>
          </div>
        )}

        {stepLabel === "Texto e título" && (
          <div className="space-y-4">
            <Field label="Título">
              <input value={state.headline} onChange={(e) => update("headline", e.target.value)} className={inputClass} />
            </Field>
            <Field label="Texto principal">
              <textarea value={state.primaryText} onChange={(e) => update("primaryText", e.target.value)} rows={3} className={inputClass} />
            </Field>
          </div>
        )}

        {stepLabel === "CTA" && (
          <Field label="Chamada para ação">
            <select value={state.cta} onChange={(e) => update("cta", e.target.value)} className={inputClass}>
              {CTAS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
        )}

        {stepLabel === "Keywords" && (
          <Field label="Palavras-chave (uma por linha)">
            <textarea value={state.keywords} onChange={(e) => update("keywords", e.target.value)} rows={5} className={inputClass} placeholder={"pousada serra da mantiqueira\nhospedagem romântica"} />
          </Field>
        )}

        {stepLabel === "Títulos" && (
          <Field label="Títulos do anúncio (um por linha, até 15)">
            <textarea value={state.headlines} onChange={(e) => update("headlines", e.target.value)} rows={5} className={inputClass} />
          </Field>
        )}

        {stepLabel === "Descrições" && (
          <Field label="Descrições do anúncio (uma por linha, até 4)">
            <textarea value={state.descriptions} onChange={(e) => update("descriptions", e.target.value)} rows={4} className={inputClass} />
          </Field>
        )}

        {stepLabel === "Revisão" && (
          <div className="space-y-3 text-sm">
            <Field label="Nome do draft (interno)">
              <input value={state.name} onChange={(e) => update("name", e.target.value)} placeholder={`${state.platform === "META" ? "Meta" : "Google"} • ${state.product || "Campanha"}`} className={inputClass} />
            </Field>
            <ReviewRow label="Plataforma" value={state.platform === "META" ? "Meta Ads" : "Google Ads"} />
            <ReviewRow label="Objetivo" value={state.objective} />
            <ReviewRow label="Produto" value={state.product} />
            <ReviewRow label="Orçamento" value={state.budget ? `R$ ${state.budget}/dia` : ""} />
            <ReviewRow label="Localização" value={state.location} />
            {state.platform === "META" ? (
              <>
                <ReviewRow label="Público" value={state.audience} />
                <ReviewRow label="Criativos" value={`${state.creativeIds.length} selecionado(s)`} />
                <ReviewRow label="Título" value={state.headline} />
                <ReviewRow label="CTA" value={state.cta} />
              </>
            ) : (
              <>
                <ReviewRow label="Landing page" value={state.landingPage} />
                <ReviewRow label="Keywords" value={`${state.keywords.split("\n").filter(Boolean).length} palavra(s)`} />
                <ReviewRow label="Títulos" value={`${state.headlines.split("\n").filter(Boolean).length} título(s)`} />
              </>
            )}
            <div className="rounded-md bg-warning-bg p-3 text-xs text-warning">
              Este botão salva apenas um rascunho local. Nenhuma campanha é publicada, alterada ou paga nesta versão.
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="rounded-md border border-border px-4 py-2 text-sm disabled:opacity-40"
        >
          Voltar
        </button>
        {step < steps.length - 1 ? (
          <button onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))} className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground">
            Próximo
          </button>
        ) : (
          <button onClick={saveDraft} disabled={saving} className="rounded-md bg-accent px-5 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50">
            {saving ? "Salvando..." : "Salvar draft"}
          </button>
        )}
      </div>
      {savedMessage && <p className="mt-2 text-sm text-muted">{savedMessage}</p>}
    </div>
  );
}

const inputClass = "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border py-1.5 last:border-0">
      <span className="text-muted">{label}</span>
      <span className="font-medium">{value || "—"}</span>
    </div>
  );
}
