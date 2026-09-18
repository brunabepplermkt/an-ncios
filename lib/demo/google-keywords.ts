// Demo data used only by the AI analysis + Analyses page until a real
// Google Ads connection is available. Clearly separate from the DB so it
// can never be confused with real account data.
export interface DemoKeyword {
  campaign: string;
  keyword: string;
  matchType: "EXACT" | "PHRASE" | "BROAD";
  qualityScore: number; // 1-10
  impressionShare: number; // 0-1
  clicks: number;
  cost: number;
  conversions: number;
}

export const demoKeywords: DemoKeyword[] = [
  { campaign: "Google Search - Institucional", keyword: "pousada serra da mantiqueira", matchType: "PHRASE", qualityScore: 8, impressionShare: 0.72, clicks: 210, cost: 480, conversions: 14 },
  { campaign: "Google Search - Institucional", keyword: "hospedagem romântica", matchType: "BROAD", qualityScore: 3, impressionShare: 0.21, clicks: 95, cost: 610, conversions: 1 },
  { campaign: "Google Search - Promoção", keyword: "desconto pousada fim de semana", matchType: "PHRASE", qualityScore: 6, impressionShare: 0.48, clicks: 140, cost: 260, conversions: 9 },
  { campaign: "Google Search - Promoção", keyword: "hotel barato perto de sp", matchType: "BROAD", qualityScore: 2, impressionShare: 0.15, clicks: 180, cost: 720, conversions: 2 },
  { campaign: "Google Search - Domo Estelar", keyword: "domo estelar hospedagem", matchType: "EXACT", qualityScore: 9, impressionShare: 0.88, clicks: 88, cost: 190, conversions: 11 },
];
