"use client";

import { useState } from "react";
import { SeverityBadge } from "./ui";

const PRESET_QUESTIONS = [
  "Analise minhas campanhas.",
  "O que piorou nos últimos 7 dias?",
  "O que melhorou?",
  "Onde estou gastando dinheiro sem resultado?",
  "Existe fadiga de criativo?",
  "Qual anúncio está chamando mais atenção?",
  "Como Meta e Google estão se comparando?",
  "O que vale testar?",
  "Quais campanhas precisam de atenção?",
  "Quais palavras-chave estão ruins?",
  "Existem search terms desperdiçando dinheiro?",
  "Que criativo você escolheria para uma nova campanha?",
];

interface Recommendation {
  title: string;
  detail: string;
  severity: "info" | "warning" | "critical";
}

interface Exchange {
  question: string;
  answer: string;
  recommendations: Recommendation[];
}

export function AnalysesPanel() {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<Exchange[]>([]);
  const [loading, setLoading] = useState(false);

  async function ask(q: string) {
    if (!q.trim() || loading) return;
    setLoading(true);
    setQuestion("");
    try {
      const res = await fetch("/api/analyses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      setHistory((prev) => [{ question: q, answer: data.answer, recommendations: data.recommendations ?? [] }, ...prev]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {PRESET_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => ask(q)}
            disabled={loading}
            className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted hover:border-accent hover:text-accent disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
        className="mb-6 flex gap-2"
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Pergunte algo sobre suas campanhas..."
          className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
        >
          {loading ? "Analisando..." : "Perguntar"}
        </button>
      </form>

      <div className="space-y-4">
        {history.map((h, i) => (
          <div key={i} className="rounded-lg border border-border bg-surface p-4">
            <p className="text-xs font-medium text-muted">{h.question}</p>
            <p className="mt-2 text-sm">{h.answer}</p>
            {h.recommendations.length > 0 && (
              <ul className="mt-3 space-y-2 border-t border-border pt-3">
                {h.recommendations.map((r, j) => (
                  <li key={j} className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{r.title}</p>
                      <p className="text-xs text-muted">{r.detail}</p>
                    </div>
                    <SeverityBadge severity={r.severity} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
        {history.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted">
            Escolha uma pergunta acima ou escreva a sua. As recomendações são apenas sugestões — nada é executado automaticamente.
          </p>
        )}
      </div>
    </div>
  );
}
