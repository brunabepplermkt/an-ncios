import { getCampaignsWithMetrics, getDashboardSummary } from "@/lib/data/campaigns";
import { getCreativeStats } from "@/lib/data/creatives";
import { demoKeywords } from "@/lib/demo/google-keywords";
import { demoSearchTerms } from "@/lib/demo/google-search-terms";
import { formatCurrency, formatPercent, formatRatio } from "@/lib/metrics/calc";
import { previousPeriod, resolvePeriod } from "@/lib/data/period";
import { getSettings } from "@/lib/settings";
import type { AIAnalysisResult, AIProvider, AnalysisContext, Recommendation } from "./provider";

function includesAny(text: string, needles: string[]) {
  return needles.some((n) => text.includes(n));
}

/**
 * Rule-based analysis over real app data (demo or, later, imported real
 * metrics) — no external LLM call. Swap for OpenAIProvider / AnthropicProvider
 * later by implementing the same AIProvider interface; nothing else changes.
 */
export class MockAIProvider implements AIProvider {
  readonly name = "mock";

  async analyze(ctx: AnalysisContext): Promise<AIAnalysisResult> {
    const q = ctx.question.toLowerCase();
    const days = ctx.days ?? 30;
    const platform = ctx.platform && ctx.platform !== "ALL" ? ctx.platform : "ALL";
    const settings = await getSettings();
    const period = resolvePeriod(days <= 7 ? "7d" : days <= 14 ? "14d" : "30d", settings.timezone);

    if (includesAny(q, ["fadiga", "cansando", "cansad"])) return this.analyzeFatigue();
    if (includesAny(q, ["piorou", "piorar", "caiu", "queda"])) return this.analyzeChange(period, platform, "worse");
    if (includesAny(q, ["melhorou", "melhorar", "subiu"])) return this.analyzeChange(period, platform, "better");
    if (includesAny(q, ["sem resultado", "gastando", "desperdi", "sem retorno"]))
      return this.analyzeWaste(period, platform);
    if (includesAny(q, ["compar", "meta e google", "meta x google", "meta vs google"]))
      return this.compareMetaGoogle(period);
    if (includesAny(q, ["testar", "test", "escolheria", "escolher"])) return this.suggestCreativeToTest();
    if (includesAny(q, ["atenção", "atencao"])) return this.analyzeNeedsAttention(period, platform);
    if (includesAny(q, ["palavra", "keyword", "keywords"])) return this.analyzeKeywords();
    if (includesAny(q, ["search term", "termo de pesquisa", "termos de busca"])) return this.analyzeSearchTerms();
    if (includesAny(q, ["chamando mais atenção", "mais atenção", "melhor anúncio", "melhor anuncio"]))
      return this.topCreative();

    return this.generalOverview(period, platform);
  }

  private async generalOverview(period: ReturnType<typeof resolvePeriod>, platform: "META" | "GOOGLE" | "ALL"): Promise<AIAnalysisResult> {
    const summary = await getDashboardSummary(period, platform);
    const recs: Recommendation[] = [];
    for (const c of summary.needsAttention.slice(0, 3)) {
      recs.push({ title: `Revisar "${c.name}"`, detail: c.reason, severity: "warning" });
    }
    const answer = [
      `No período analisado, o investimento total foi ${formatCurrency(summary.totals.spend)}`,
      summary.totals.conversions ? `com ${summary.totals.conversions.toFixed(0)} conversões (CPA ${formatCurrency(summary.totals.cpa)}).` : "sem conversões registradas.",
      summary.needsAttention.length > 0
        ? `${summary.needsAttention.length} campanha(s) merecem atenção — veja recomendações abaixo.`
        : "Nenhuma campanha com sinais de alerta neste período.",
    ].join(" ");
    return { answer, recommendations: recs };
  }

  private async analyzeFatigue(): Promise<AIAnalysisResult> {
    const stats = await getCreativeStats(7);
    const fatigued = stats
      .filter((s) => (s.fatigueDropPct ?? 0) > 15)
      .sort((a, b) => (b.fatigueDropPct ?? 0) - (a.fatigueDropPct ?? 0));

    if (fatigued.length === 0) {
      return { answer: "Não identifiquei sinais claros de fadiga de criativo nos últimos 7 dias vs. os 7 dias anteriores.", recommendations: [] };
    }

    const answer = `Encontrei ${fatigued.length} criativo(s) com queda de CTR: ${fatigued
      .slice(0, 3)
      .map((f) => `"${f.fileName}" (${f.fatigueDropPct!.toFixed(0)}% de queda)`)
      .join(", ")}.`;

    const recommendations: Recommendation[] = fatigued.slice(0, 5).map((f) => ({
      title: `Trocar ou pausar "${f.fileName}"`,
      detail: `CTR caiu ${f.fatigueDropPct!.toFixed(0)}% na última semana. Usado em: ${f.campaignsUsed.join(", ") || "—"}.`,
      severity: f.fatigueDropPct! > 30 ? "critical" : "warning",
    }));

    return { answer, recommendations };
  }

  private async analyzeChange(period: ReturnType<typeof resolvePeriod>, platform: "META" | "GOOGLE" | "ALL", direction: "worse" | "better"): Promise<AIAnalysisResult> {
    const current = await getCampaignsWithMetrics(period, platform);
    const prev = await getCampaignsWithMetrics(previousPeriod(period), platform);
    const prevById = new Map(prev.map((c) => [c.id, c]));

    const deltas = current
      .filter((c) => c.raw.spend > 5)
      .map((c) => {
        const p = prevById.get(c.id);
        const ctrDelta = c.normalized.ctr !== undefined && p?.normalized.ctr ? (c.normalized.ctr - p.normalized.ctr) / p.normalized.ctr : undefined;
        const cpaDelta = c.normalized.cpa !== undefined && p?.normalized.cpa ? (c.normalized.cpa - p.normalized.cpa) / p.normalized.cpa : undefined;
        return { campaign: c, ctrDelta, cpaDelta };
      })
      .filter((d) => d.ctrDelta !== undefined || d.cpaDelta !== undefined);

    const sorted = deltas.sort((a, b) => {
      const scoreA = (a.ctrDelta ?? 0) - (a.cpaDelta ?? 0);
      const scoreB = (b.ctrDelta ?? 0) - (b.cpaDelta ?? 0);
      return direction === "worse" ? scoreA - scoreB : scoreB - scoreA;
    });

    const picked = sorted.slice(0, 4);
    if (picked.length === 0) {
      return { answer: "Não há dados suficientes no período anterior para comparar.", recommendations: [] };
    }

    const answer = `Campanhas que mais ${direction === "worse" ? "pioraram" : "melhoraram"} (vs. período anterior): ${picked
      .map((d) => {
        const parts: string[] = [];
        if (d.ctrDelta !== undefined) parts.push(`CTR ${formatPercent(Math.abs(d.ctrDelta))} ${d.ctrDelta >= 0 ? "↑" : "↓"}`);
        if (d.cpaDelta !== undefined) parts.push(`CPA ${formatPercent(Math.abs(d.cpaDelta))} ${d.cpaDelta >= 0 ? "↑" : "↓"}`);
        return `"${d.campaign.name}" (${parts.join(", ")})`;
      })
      .join("; ")}.`;

    const recommendations: Recommendation[] = picked
      .filter(() => direction === "worse")
      .map((d) => ({
        title: `Investigar "${d.campaign.name}"`,
        detail: d.cpaDelta && d.cpaDelta > 0.15 ? "CPA subindo — revisar orçamento, público ou criativo." : "CTR em queda — considerar novo criativo.",
        severity: "warning",
      }));

    return { answer, recommendations };
  }

  private async analyzeWaste(period: ReturnType<typeof resolvePeriod>, platform: "META" | "GOOGLE" | "ALL"): Promise<AIAnalysisResult> {
    const campaigns = await getCampaignsWithMetrics(period, platform);
    const wasteful = campaigns
      .filter((c) => c.raw.spend > 10 && c.raw.conversions === 0)
      .sort((a, b) => b.raw.spend - a.raw.spend);

    if (wasteful.length === 0) {
      return { answer: "Nenhuma campanha com gasto relevante e zero conversões no período.", recommendations: [] };
    }

    const answer = `${wasteful.length} campanha(s) gastando sem gerar conversão: ${wasteful
      .map((c) => `"${c.name}" (${formatCurrency(c.raw.spend)})`)
      .join(", ")}.`;

    const recommendations: Recommendation[] = wasteful.slice(0, 5).map((c) => ({
      title: `Revisar orçamento de "${c.name}"`,
      detail: `${formatCurrency(c.raw.spend)} gastos, 0 conversões no período.`,
      severity: "critical",
    }));

    return { answer, recommendations };
  }

  private async compareMetaGoogle(period: ReturnType<typeof resolvePeriod>): Promise<AIAnalysisResult> {
    const summary = await getDashboardSummary(period, "ALL");
    const m = summary.metaTotals;
    const g = summary.googleTotals;

    const answer = [
      `Meta: gasto ${formatCurrency(m.spend)}, CPA ${formatCurrency(m.cpa)}, CTR ${formatPercent(m.ctr)}, ROAS ${formatRatio(m.roas)}.`,
      `Google: gasto ${formatCurrency(g.spend)}, CPA ${formatCurrency(g.cpa)}, CTR ${formatPercent(g.ctr)}, ROAS ${formatRatio(g.roas)}.`,
      "Compare mais de uma métrica antes de concluir qual canal está performando melhor — CPA baixo com poucas conversões pode não ser mais confiável que CPA um pouco maior com volume.",
    ].join(" ");

    return { answer, recommendations: [] };
  }

  private async suggestCreativeToTest(): Promise<AIAnalysisResult> {
    const stats = await getCreativeStats(7);
    const unused = stats.filter((s) => s.neverUsed);
    const top = [...stats].filter((s) => !s.neverUsed).sort((a, b) => (b.totalNormalized.ctr ?? 0) - (a.totalNormalized.ctr ?? 0))[0];

    const parts: string[] = [];
    if (top) parts.push(`Seu criativo com melhor CTR até agora é "${top.fileName}" (${formatPercent(top.totalNormalized.ctr)}) — vale testar uma variação dele.`);
    if (unused.length > 0) parts.push(`Você também tem ${unused.length} criativo(s) nunca usados que ainda não foram testados: ${unused.slice(0, 3).map((u) => `"${u.fileName}"`).join(", ")}.`);

    return { answer: parts.join(" ") || "Ainda não há dados de desempenho de criativos suficientes.", recommendations: [] };
  }

  private async topCreative(): Promise<AIAnalysisResult> {
    const stats = await getCreativeStats(7);
    const sorted = [...stats].filter((s) => s.totalRaw.impressions > 0).sort((a, b) => (b.totalNormalized.ctr ?? 0) - (a.totalNormalized.ctr ?? 0));
    if (sorted.length === 0) return { answer: "Ainda não há criativos com veiculação suficiente para comparar.", recommendations: [] };
    const best = sorted[0];
    return {
      answer: `"${best.fileName}" está chamando mais atenção, com CTR de ${formatPercent(best.totalNormalized.ctr)} em ${best.campaignsUsed.join(", ") || "—"}.`,
      recommendations: [],
    };
  }

  private async analyzeNeedsAttention(period: ReturnType<typeof resolvePeriod>, platform: "META" | "GOOGLE" | "ALL"): Promise<AIAnalysisResult> {
    const summary = await getDashboardSummary(period, platform);
    if (summary.needsAttention.length === 0) {
      return { answer: "Nenhuma campanha com sinais de alerta no momento.", recommendations: [] };
    }
    const answer = `${summary.needsAttention.length} campanha(s) precisam de atenção: ${summary.needsAttention.map((c) => `"${c.name}" — ${c.reason}`).join("; ")}.`;
    const recommendations: Recommendation[] = summary.needsAttention.map((c) => ({
      title: c.name,
      detail: c.reason,
      severity: "warning",
    }));
    return { answer, recommendations };
  }

  private async analyzeKeywords(): Promise<AIAnalysisResult> {
    const bad = demoKeywords.filter((k) => k.qualityScore <= 4 || k.impressionShare < 0.3).sort((a, b) => b.cost - a.cost);
    if (bad.length === 0) return { answer: "Nenhuma keyword com quality score baixo nos dados disponíveis.", recommendations: [] };
    const answer = `Keywords com quality score baixo ou pouca impression share: ${bad
      .map((k) => `"${k.keyword}" (QS ${k.qualityScore}, IS ${formatPercent(k.impressionShare)}, ${formatCurrency(k.cost)} gastos)`)
      .join("; ")}.`;
    const recommendations: Recommendation[] = bad.map((k) => ({
      title: `Revisar keyword "${k.keyword}"`,
      detail: `Campanha: ${k.campaign}. Quality Score ${k.qualityScore}/10 — considerar pausar, trocar match type ou melhorar página de destino.`,
      severity: k.qualityScore <= 3 ? "critical" : "warning",
    }));
    return { answer, recommendations };
  }

  private async analyzeSearchTerms(): Promise<AIAnalysisResult> {
    const wasteful = demoSearchTerms.filter((t) => t.conversions === 0 && t.cost > 20).sort((a, b) => b.cost - a.cost);
    if (wasteful.length === 0) return { answer: "Nenhum search term desperdiçando orçamento nos dados disponíveis.", recommendations: [] };
    const answer = `Search terms sem conversão consumindo orçamento: ${wasteful.map((t) => `"${t.searchTerm}" (${formatCurrency(t.cost)}, intenção ${t.intent})`).join("; ")}.`;
    const recommendations: Recommendation[] = wasteful.map((t) => ({
      title: `Adicionar "${t.searchTerm}" como negativa`,
      detail: `Campanha: ${t.campaign}. ${formatCurrency(t.cost)} gastos sem conversão.`,
      severity: "warning",
    }));
    return { answer, recommendations };
  }
}

export const mockAIProvider = new MockAIProvider();
