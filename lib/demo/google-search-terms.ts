// Demo data used only by the AI analysis + Analyses page until a real
// Google Ads connection is available.
export interface DemoSearchTerm {
  campaign: string;
  searchTerm: string;
  intent: "commercial" | "informational" | "navigational" | "unknown";
  clicks: number;
  cost: number;
  conversions: number;
}

export const demoSearchTerms: DemoSearchTerm[] = [
  { campaign: "Google Search - Promoção", searchTerm: "pousada gratis", intent: "informational", clicks: 34, cost: 96, conversions: 0 },
  { campaign: "Google Search - Promoção", searchTerm: "trabalhar na pousada", intent: "navigational", clicks: 12, cost: 28, conversions: 0 },
  { campaign: "Google Search - Institucional", searchTerm: "pousada mirante reserva", intent: "commercial", clicks: 61, cost: 140, conversions: 8 },
  { campaign: "Google Search - Institucional", searchTerm: "clima serra da mantiqueira hoje", intent: "informational", clicks: 22, cost: 51, conversions: 0 },
  { campaign: "Google Search - Domo Estelar", searchTerm: "domo estelar reservar quarto", intent: "commercial", clicks: 40, cost: 85, conversions: 6 },
];
