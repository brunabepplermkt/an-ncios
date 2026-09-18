"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface IntegrationAccountOption {
  id: string; // value sent to select-account as accountId
  name: string;
  extra?: string;
}

export interface IntegrationSyncLogItem {
  id: string;
  status: "SUCCESS" | "ERROR";
  message: string | null;
  campaignsImported: number;
  createdAt: string;
}

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  NOT_CONNECTED: { label: "Não conectado", className: "bg-surface-muted text-muted" },
  CONFIG_REQUIRED: { label: "Configuração necessária", className: "bg-warning-bg text-warning" },
  CONNECTED: { label: "Conectado", className: "bg-success-bg text-success" },
  ERROR: { label: "Erro", className: "bg-critical-bg text-critical" },
};

export function IntegrationPanel({
  platform,
  title,
  summary,
  recentLogs,
  testEndpoint,
  selectEndpoint,
  syncEndpoint,
  accountFieldLabel,
  showLoginCustomerId = false,
  setupSteps,
}: {
  platform: "META" | "GOOGLE";
  title: string;
  summary: {
    status: string;
    detail: string;
    accountId: string | null;
    accountName: string | null;
    lastSyncedAt: string | null;
    lastSyncCampaigns: number | null;
    lastSyncPeriodStart: string | null;
    lastSyncPeriodEnd: string | null;
  };
  recentLogs: IntegrationSyncLogItem[];
  testEndpoint: string;
  selectEndpoint: string;
  syncEndpoint: string;
  accountFieldLabel: string;
  showLoginCustomerId?: boolean;
  setupSteps: string[];
}) {
  const router = useRouter();
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [accounts, setAccounts] = useState<IntegrationAccountOption[]>([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [loginCustomerId, setLoginCustomerId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"ok" | "error">("ok");

  const style = STATUS_STYLE[summary.status] ?? STATUS_STYLE.NOT_CONNECTED;

  async function testConnection() {
    setTesting(true);
    setMessage(null);
    try {
      const res = await fetch(testEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(showLoginCustomerId ? { loginCustomerId } : {}),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMessageTone("error");
        setMessage(data.error ?? "Falha ao testar conexão.");
        router.refresh();
        return;
      }
      const opts: IntegrationAccountOption[] =
        platform === "META"
          ? (data.accounts ?? []).map((a: { id: string; accountId: string; name: string; currency: string }) => ({
              id: a.id,
              name: a.name,
              extra: a.currency,
            }))
          : (data.accounts ?? []).map((a: { customerId: string; name: string; isManager: boolean; currency?: string }) => ({
              id: a.customerId,
              name: a.name,
              extra: a.isManager ? "MCC" : a.currency,
            }));
      setAccounts(opts);
      setMessageTone("ok");
      setMessage(opts.length > 0 ? `Conexão OK. ${opts.length} conta(s) encontrada(s) — selecione uma abaixo.` : "Conexão OK, mas nenhuma conta acessível foi encontrada.");
      router.refresh();
    } catch (err) {
      setMessageTone("error");
      setMessage((err as Error).message);
    } finally {
      setTesting(false);
    }
  }

  async function selectAccount() {
    const account = accounts.find((a) => a.id === selectedAccount);
    if (!account) return;
    await fetch(selectEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId: account.id, accountName: account.name, loginCustomerId: loginCustomerId || undefined }),
    });
    setMessageTone("ok");
    setMessage(`Conta "${account.name}" selecionada. Clique em Sincronizar agora.`);
    router.refresh();
  }

  async function sync() {
    setSyncing(true);
    setMessage(null);
    try {
      const res = await fetch(syncEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: 30 }),
      });
      const data = await res.json();
      setMessageTone(data.ok ? "ok" : "error");
      setMessage(data.ok ? `${data.message}${data.creativesLinked ? ` · ${data.creativesLinked} criativo(s) vinculados.` : ""}` : data.error ?? "Falha na sincronização.");
      router.refresh();
    } catch (err) {
      setMessageTone("error");
      setMessage((err as Error).message);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className={`rounded-md px-2.5 py-1 text-xs font-medium ${style.className}`}>{style.label}</span>
      </div>
      <p className="mt-2 text-sm text-muted">{summary.detail}</p>

      {summary.accountId && (
        <p className="mt-2 text-xs text-muted">
          Conta selecionada: <strong className="text-foreground">{summary.accountName ?? summary.accountId}</strong>
        </p>
      )}
      {summary.lastSyncedAt && (
        <p className="mt-1 text-xs text-muted">
          Última sincronização: {new Date(summary.lastSyncedAt).toLocaleString("pt-BR")} · {summary.lastSyncCampaigns ?? 0} campanha(s)
          {summary.lastSyncPeriodStart && summary.lastSyncPeriodEnd && (
            <>
              {" "}
              · período {new Date(summary.lastSyncPeriodStart).toLocaleDateString("pt-BR")} a {new Date(summary.lastSyncPeriodEnd).toLocaleDateString("pt-BR")}
            </>
          )}
        </p>
      )}

      <div className="mt-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Configurar</p>
        <ol className="list-decimal space-y-1 pl-4 text-sm">
          {setupSteps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      </div>

      {showLoginCustomerId && (
        <label className="mt-3 block text-xs">
          <span className="mb-1 block font-medium text-muted">Login Customer ID (MCC, opcional)</span>
          <input
            value={loginCustomerId}
            onChange={(e) => setLoginCustomerId(e.target.value)}
            placeholder="1234567890"
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          onClick={testConnection}
          disabled={testing}
          className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-surface-muted disabled:opacity-50"
        >
          {testing ? "Testando..." : "Testar conexão"}
        </button>
        <button
          onClick={sync}
          disabled={syncing || !summary.accountId}
          className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
          title={!summary.accountId ? "Selecione uma conta primeiro" : undefined}
        >
          {syncing ? "Sincronizando..." : "Sincronizar agora"}
        </button>
      </div>

      {accounts.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-md border border-accent bg-accent/5 p-3">
          <span className="text-xs font-medium">{accountFieldLabel}:</span>
          <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)} className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm">
            <option value="">Selecione...</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} {a.extra ? `(${a.extra})` : ""} — {a.id}
              </option>
            ))}
          </select>
          <button onClick={selectAccount} disabled={!selectedAccount} className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground disabled:opacity-50">
            Usar esta conta
          </button>
        </div>
      )}

      {message && <p className={`mt-3 text-sm ${messageTone === "error" ? "text-critical" : "text-success"}`}>{message}</p>}

      {recentLogs.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs font-medium text-muted">Histórico de sincronizações ({recentLogs.length})</summary>
          <ul className="mt-2 space-y-1 text-xs">
            {recentLogs.map((log) => (
              <li key={log.id} className="flex items-center justify-between border-b border-border py-1 last:border-0">
                <span className={log.status === "SUCCESS" ? "text-success" : "text-critical"}>{log.status === "SUCCESS" ? "OK" : "Erro"}</span>
                <span className="text-muted">{log.message}</span>
                <span className="text-muted">{new Date(log.createdAt).toLocaleString("pt-BR")}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
