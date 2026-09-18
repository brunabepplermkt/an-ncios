import type { RawMetrics } from "@/lib/metrics/types";

export const INITIAL_CATEGORIES = [
  "Domo Estelar",
  "Mirante",
  "Ágata",
  "Doce Recanto",
  "Celeiro",
  "Sítio Vó Deny",
  "Institucional",
  "Experiências",
  "Promoção",
] as const;

// Deterministic PRNG so `npm run seed` produces stable, reviewable demo data.
function mulberry32(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface DemoCampaignProfile {
  key: string;
  platform: "META" | "GOOGLE";
  name: string;
  status: "ACTIVE" | "PAUSED";
  objective: string;
  dailyBudget: number;
  /** Baseline daily numbers the generator wobbles around. */
  baseImpressions: number;
  baseCtr: number;
  baseCpc: number;
  convRate: number; // conversions per click
  avgTicket?: number; // for ROAS-bearing campaigns (revenue = conversions * avgTicket)
  hasReach: boolean;
  /** Trend applied over the last `trendDays` days. */
  trend?: "fatigue" | "rising_cpa" | "improving";
  trendDays?: number;
}

export const DEMO_CAMPAIGNS: DemoCampaignProfile[] = [
  {
    key: "meta-domo-conv",
    platform: "META",
    name: "Meta • Domo Estelar — Conversão",
    status: "ACTIVE",
    objective: "Conversões",
    dailyBudget: 120,
    baseImpressions: 9000,
    baseCtr: 0.021,
    baseCpc: 1.35,
    convRate: 0.06,
    avgTicket: 480,
    hasReach: true,
    trend: "fatigue",
    trendDays: 10,
  },
  {
    key: "meta-mirante-trafego",
    platform: "META",
    name: "Meta • Mirante — Tráfego",
    status: "ACTIVE",
    objective: "Tráfego",
    dailyBudget: 60,
    baseImpressions: 14000,
    baseCtr: 0.016,
    baseCpc: 0.62,
    convRate: 0.02,
    avgTicket: 420,
    hasReach: true,
  },
  {
    key: "meta-promocao-fds",
    platform: "META",
    name: "Meta • Promoção Fim de Semana",
    status: "ACTIVE",
    objective: "Conversões",
    dailyBudget: 90,
    baseImpressions: 11000,
    baseCtr: 0.024,
    baseCpc: 1.05,
    convRate: 0.05,
    avgTicket: 310,
    hasReach: true,
    trend: "improving",
    trendDays: 10,
  },
  {
    key: "meta-institucional",
    platform: "META",
    name: "Meta • Institucional — Reconhecimento",
    status: "PAUSED",
    objective: "Reconhecimento de marca",
    dailyBudget: 40,
    baseImpressions: 20000,
    baseCtr: 0.008,
    baseCpc: 0.35,
    convRate: 0.004,
    hasReach: true,
  },
  {
    key: "google-institucional",
    platform: "GOOGLE",
    name: "Google Search • Institucional",
    status: "ACTIVE",
    objective: "Leads",
    dailyBudget: 70,
    baseImpressions: 3200,
    baseCtr: 0.055,
    baseCpc: 2.1,
    convRate: 0.09,
    avgTicket: 460,
    hasReach: false,
  },
  {
    key: "google-promocao",
    platform: "GOOGLE",
    name: "Google Search • Promoção",
    status: "ACTIVE",
    objective: "Vendas",
    dailyBudget: 55,
    baseImpressions: 2600,
    baseCtr: 0.048,
    baseCpc: 1.85,
    convRate: 0.045,
    avgTicket: 300,
    hasReach: false,
    trend: "rising_cpa",
    trendDays: 12,
  },
  {
    key: "google-domo",
    platform: "GOOGLE",
    name: "Google Search • Domo Estelar",
    status: "ACTIVE",
    objective: "Leads",
    dailyBudget: 35,
    baseImpressions: 1400,
    baseCtr: 0.062,
    baseCpc: 2.4,
    convRate: 0.12,
    avgTicket: 480,
    hasReach: false,
  },
  {
    key: "google-pmax",
    platform: "GOOGLE",
    name: "Google Performance Max • Geral",
    status: "PAUSED",
    objective: "Vendas",
    dailyBudget: 45,
    baseImpressions: 5200,
    baseCtr: 0.02,
    baseCpc: 1.4,
    convRate: 0.03,
    avgTicket: 350,
    hasReach: false,
  },
];

export interface GeneratedDailyMetric extends RawMetrics {
  date: Date;
}

export function generateDailyMetrics(profile: DemoCampaignProfile, days: number): GeneratedDailyMetric[] {
  const rand = mulberry32(hashKey(profile.key));
  const rows: GeneratedDailyMetric[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    const dayIndexFromEnd = i; // 0 = today
    let ctrMultiplier = 1;
    let cpaMultiplier = 1;

    if (profile.trend === "fatigue" && profile.trendDays && dayIndexFromEnd < profile.trendDays) {
      const progress = 1 - dayIndexFromEnd / profile.trendDays; // 0 -> 1 approaching today
      ctrMultiplier = 1 - progress * 0.45; // CTR decays up to 45%
    }
    if (profile.trend === "rising_cpa" && profile.trendDays && dayIndexFromEnd < profile.trendDays) {
      const progress = 1 - dayIndexFromEnd / profile.trendDays;
      cpaMultiplier = 1 + progress * 0.6; // effective CPC/cost creeps up
    }
    if (profile.trend === "improving" && profile.trendDays && dayIndexFromEnd < profile.trendDays) {
      const progress = 1 - dayIndexFromEnd / profile.trendDays;
      ctrMultiplier = 1 + progress * 0.3;
      cpaMultiplier = 1 - progress * 0.15;
    }

    const wobble = () => 0.85 + rand() * 0.3;

    const impressions = Math.round(profile.baseImpressions * wobble());
    const ctr = Math.max(0.002, profile.baseCtr * ctrMultiplier * wobble());
    const clicks = Math.round(impressions * ctr);
    const cpc = Math.max(0.1, profile.baseCpc * cpaMultiplier * wobble());
    const spend = Number((clicks * cpc).toFixed(2));
    const conversions = Math.max(0, Math.round(clicks * profile.convRate * wobble()));
    const revenue = profile.avgTicket ? Number((conversions * profile.avgTicket * wobble()).toFixed(2)) : undefined;
    const reach = profile.hasReach ? Math.round(impressions / (1.3 + rand() * 0.9)) : undefined;
    const frequency = profile.hasReach && reach ? Number((impressions / reach).toFixed(2)) : undefined;

    rows.push({ date, impressions, clicks, spend, conversions, revenue, reach, frequency });
  }

  return rows;
}

function hashKey(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (Math.imul(31, h) + key.charCodeAt(i)) | 0;
  }
  return h;
}

export interface DemoCreativeProfile {
  key: string;
  fileName: string;
  kind: "IMAGE" | "VIDEO";
  category: (typeof INITIAL_CATEGORIES)[number];
  product: string;
  tags: string[];
  width?: number;
  height?: number;
  durationSeconds?: number;
  note?: string;
  /** Performance profile used to generate CreativeMetricDaily rows. */
  performance: "top" | "average" | "fatigued" | "unused";
  usedInCampaignKeys: string[];
}

export const DEMO_CREATIVES: DemoCreativeProfile[] = [
  { key: "domo-por-do-sol", fileName: "domo-estelar-por-do-sol.jpg", kind: "IMAGE", category: "Domo Estelar", product: "Domo Estelar", tags: ["pôr do sol", "externa"], width: 1200, height: 1500, performance: "top", usedInCampaignKeys: ["meta-domo-conv", "google-domo"] },
  { key: "domo-interior-noite", fileName: "domo-estelar-interior-noite.mp4", kind: "VIDEO", category: "Domo Estelar", product: "Domo Estelar", tags: ["interior", "estrelas"], durationSeconds: 18, performance: "fatigued", usedInCampaignKeys: ["meta-domo-conv"] },
  { key: "mirante-vista", fileName: "mirante-vista-panoramica.jpg", kind: "IMAGE", category: "Mirante", product: "Mirante", tags: ["vista", "manhã"], width: 1600, height: 1000, performance: "average", usedInCampaignKeys: ["meta-mirante-trafego"] },
  { key: "mirante-cafe", fileName: "mirante-cafe-da-manha.jpg", kind: "IMAGE", category: "Mirante", product: "Mirante", tags: ["café da manhã"], width: 1200, height: 1200, performance: "average", usedInCampaignKeys: ["meta-mirante-trafego"] },
  { key: "agata-suite", fileName: "agata-suite-master.jpg", kind: "IMAGE", category: "Ágata", product: "Ágata", tags: ["suíte", "banheira"], width: 1200, height: 1500, performance: "unused", usedInCampaignKeys: [] },
  { key: "doce-recanto-jardim", fileName: "doce-recanto-jardim.jpg", kind: "IMAGE", category: "Doce Recanto", product: "Doce Recanto", tags: ["jardim", "família"], width: 1200, height: 900, performance: "average", usedInCampaignKeys: [] },
  { key: "celeiro-evento", fileName: "celeiro-espaco-eventos.mp4", kind: "VIDEO", category: "Celeiro", product: "Celeiro", tags: ["evento", "casamento"], durationSeconds: 24, performance: "top", usedInCampaignKeys: [] },
  { key: "sitio-trilha", fileName: "sitio-vo-deny-trilha.jpg", kind: "IMAGE", category: "Sítio Vó Deny", product: "Sítio Vó Deny", tags: ["trilha", "natureza"], width: 1600, height: 1200, performance: "unused", usedInCampaignKeys: [] },
  { key: "institucional-drone", fileName: "institucional-vista-aerea.mp4", kind: "VIDEO", category: "Institucional", product: "Institucional", tags: ["drone", "aérea"], durationSeconds: 30, performance: "average", usedInCampaignKeys: ["meta-institucional", "google-institucional"] },
  { key: "experiencias-trilha-guiada", fileName: "experiencias-trilha-guiada.jpg", kind: "IMAGE", category: "Experiências", product: "Trilha guiada", tags: ["experiência", "guia"], width: 1200, height: 1500, performance: "average", usedInCampaignKeys: [] },
  { key: "promocao-banner-fds", fileName: "promocao-fim-de-semana.jpg", kind: "IMAGE", category: "Promoção", product: "Pacote fim de semana", tags: ["oferta", "desconto"], width: 1080, height: 1080, performance: "top", usedInCampaignKeys: ["meta-promocao-fds", "google-promocao"] },
  { key: "promocao-video-oferta", fileName: "promocao-video-oferta.mp4", kind: "VIDEO", category: "Promoção", product: "Pacote fim de semana", tags: ["oferta", "vídeo"], durationSeconds: 15, performance: "fatigued", usedInCampaignKeys: ["meta-promocao-fds"] },
];
