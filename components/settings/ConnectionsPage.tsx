"use client";

import { useEffect, useState } from "react";
import { BrandSectionHeader } from "@/components/ui/BrandSectionHeader";
import { BrandCard } from "@/components/ui/BrandCard";
import { BrandBadge } from "@/components/ui/BrandBadge";
import { BrandButton } from "@/components/ui/BrandButton";
import {
  PROVIDER_LABELS,
  getConnectionsByProvider,
  getConfigById,
  type ConnectionProvider,
  type ConnectionRecord,
} from "@/lib/connections";
import { Loader2, Mail, Plus } from "lucide-react";

const STATUS_TONE: Record<string, "default" | "success" | "warning" | "danger"> = {
  disconnected: "default",
  connected: "success",
  pending: "warning",
  error: "danger",
};

const STATUS_LABEL: Record<string, string> = {
  disconnected: "Disconnected",
  connected: "Connected",
  pending: "Pending",
  error: "Error",
};

function formatRelativeTime(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

function groupConnectionsByProviderAndAccount(
  connections: ConnectionRecord[]
): Record<ConnectionProvider, Record<string, ConnectionRecord[]>> {
  const result: Record<ConnectionProvider, Record<string, ConnectionRecord[]>> = {
    google: {},
    microsoft: {},
    apple: {},
  };

  for (const conn of connections) {
    const accountKey = conn.accountEmail ?? `pending-${conn.id}`;
    if (!result[conn.provider][accountKey]) {
      result[conn.provider][accountKey] = [];
    }
    result[conn.provider][accountKey].push(conn);
  }

  return result;
}

export function ConnectionsPageContent() {
  const [connections, setConnections] = useState<ConnectionRecord[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    fetch("/api/v1/settings/connections")
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error.message);
        setConnections(json.data?.connections ?? []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleConnect = (provider: ConnectionProvider, service?: string) => {
    if (provider === "google") {
      const svc = service === "gmail" ? "gmail" : service === "google_calendar" ? "google_calendar" : "google_calendar";
      setActionId(service ?? provider);
      window.location.href = `/api/v1/auth/google/connect?service=${svc}`;
      return;
    }
    setActionId(provider);
    setTimeout(() => {
      setActionId(null);
      alert("Connect flow coming soon for this provider.");
    }, 500);
  };

  const handleDisconnect = async (id: string) => {
    setActionId(id);
    try {
      const r = await fetch(`/api/v1/settings/connections/${id}`, { method: "DELETE" });
      const json = await r.json();
      if (!r.ok) throw new Error(json?.error?.message ?? "Failed to disconnect");
      load();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setActionId(null);
    }
  };

  const handlePatch = async (
    id: string,
    patch: {
      isDefault?: boolean;
      isEnabled?: boolean;
      enabledForAi?: boolean;
      enabledForCalendar?: boolean;
      enabledForPriorityInbox?: boolean;
    }
  ) => {
    try {
      const r = await fetch(`/api/v1/settings/connections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json?.error?.message ?? "Failed to update");
      load();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const byProvider = getConnectionsByProvider();
  const providers: ConnectionProvider[] = ["google", "microsoft", "apple"];
  const grouped = connections ? groupConnectionsByProviderAndAccount(connections) : null;

  if (loading && !connections) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
      </div>
    );
  }

  if (error) {
    return (
      <BrandCard padded>
        <p className="text-[var(--brand-danger)]">{error}</p>
      </BrandCard>
    );
  }

  return (
    <div className="space-y-8">
      <BrandSectionHeader
        title="Connections"
        description="Connect multiple email and calendar accounts. Each account can be enabled for AI, Home calendar, and priority inbox."
      />
      {providers.map((provider) => {
        const configs = byProvider[provider];
        const accountMap = grouped?.[provider] ?? {};
        const accountKeys = Object.keys(accountMap).sort((a, b) => {
          const emailA = accountMap[a][0]?.accountEmail ?? "";
          const emailB = accountMap[b][0]?.accountEmail ?? "";
          return emailA.localeCompare(emailB);
        });

        return (
          <section key={provider}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--brand-text-muted)]">
                {PROVIDER_LABELS[provider]}
              </h2>
              <BrandButton
                variant="secondary"
                size="sm"
                onClick={() => handleConnect(provider)}
                disabled={actionId === provider}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add account
              </BrandButton>
            </div>

            {accountKeys.length === 0 ? (
              <BrandCard padded className="border border-dashed">
                <p className="text-sm text-[var(--brand-text-muted)] mb-3">
                  No {PROVIDER_LABELS[provider]} accounts connected.
                </p>
                <p className="text-xs text-[var(--brand-text-muted)]">
                  Connect Gmail, Calendar, or other services to get started.
                </p>
                <BrandButton
                  variant="accent"
                  size="sm"
                  className="mt-3"
                  onClick={() => handleConnect(provider)}
                  disabled={actionId === provider}
                >
                  {actionId === provider ? "Connecting…" : `Connect ${PROVIDER_LABELS[provider]}`}
                </BrandButton>
              </BrandCard>
            ) : (
              <div className="space-y-4">
                {accountKeys.map((accountKey) => {
                  const conns = accountMap[accountKey];
                  const accountEmail = conns[0]?.accountEmail ?? null;
                  const accountLabel = conns[0]?.accountLabel ?? null;
                  const displayName = accountLabel ?? accountEmail ?? "Pending";

                  return (
                    <div
                      key={accountKey}
                      className="rounded-[var(--radius-lg)] border border-[var(--brand-border)] bg-[var(--brand-surface)] p-5"
                    >
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                          <h3 className="font-medium text-[var(--brand-text)]">
                            {displayName}
                          </h3>
                          {accountEmail && accountLabel && (
                            <p className="text-sm text-[var(--brand-text-muted)]">{accountEmail}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {conns.some((c) => c.isDefault) && (
                            <BrandBadge tone="default">Default</BrandBadge>
                          )}
                          <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                            <input
                              type="checkbox"
                              checked={conns.every((c) => c.isEnabled)}
                              onChange={(e) =>
                                conns.forEach((c) => handlePatch(c.id, { isEnabled: e.target.checked }))
                              }
                            />
                            Enabled
                          </label>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {conns.map((conn) => {
                          const config = getConfigById(conn.configId);
                          const Icon = config?.icon ?? Mail;
                          const lastSync = formatRelativeTime(conn.lastSyncAt);
                          const isConnected = conn.status === "connected";
                          const isActioning = actionId === conn.id;

                          return (
                            <div
                              key={conn.id}
                              className="flex items-center justify-between rounded-md bg-[var(--brand-surface-alt)] px-4 py-3"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <Icon className="h-5 w-5 shrink-0 text-[var(--brand-text-muted)]" />
                                <div className="min-w-0">
                                  <span className="font-medium text-sm text-[var(--brand-text)]">
                                    {config?.name ?? conn.configId}
                                  </span>
                                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                    <BrandBadge tone={STATUS_TONE[conn.status] ?? "default"}>
                                      {STATUS_LABEL[conn.status] ?? conn.status}
                                    </BrandBadge>
                                    {lastSync && isConnected && (
                                      <span className="text-xs text-[var(--brand-text-muted)]">
                                        Last sync: {lastSync}
                                      </span>
                                    )}
                                    {conn.errorMessage && (
                                      <span className="text-xs text-[var(--brand-danger)]">
                                        {conn.errorMessage}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-4 shrink-0">
                                {config?.features.includes("email") && (
                                  <label className="flex items-center gap-1 text-xs cursor-pointer text-[var(--brand-text-muted)]">
                                    <input
                                      type="checkbox"
                                      checked={conn.enabledForPriorityInbox}
                                      onChange={(e) =>
                                        handlePatch(conn.id, {
                                          enabledForPriorityInbox: e.target.checked,
                                        })
                                      }
                                    />
                                    Inbox
                                  </label>
                                )}
                                {config?.features.includes("calendar") && (
                                  <label className="flex items-center gap-1 text-xs cursor-pointer text-[var(--brand-text-muted)]">
                                    <input
                                      type="checkbox"
                                      checked={conn.enabledForCalendar}
                                      onChange={(e) =>
                                        handlePatch(conn.id, {
                                          enabledForCalendar: e.target.checked,
                                        })
                                      }
                                    />
                                    Calendar
                                  </label>
                                )}
                                <label className="flex items-center gap-1 text-xs cursor-pointer text-[var(--brand-text-muted)]">
                                  <input
                                    type="checkbox"
                                    checked={conn.enabledForAi}
                                    onChange={(e) =>
                                      handlePatch(conn.id, { enabledForAi: e.target.checked })
                                    }
                                  />
                                  AI
                                </label>
                                {isConnected ? (
                                  <BrandButton
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDisconnect(conn.id)}
                                    disabled={isActioning}
                                  >
                                    {isActioning ? "Disconnecting…" : "Disconnect"}
                                  </BrandButton>
                                ) : (
                                  <BrandButton
                                    variant="accent"
                                    size="sm"
                                    onClick={() => handleConnect(provider, config?.service)}
                                    disabled={!!actionId}
                                  >
                                    {actionId ? "Connecting…" : "Connect"}
                                  </BrandButton>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {/* Show available services not yet connected for this account */}
                        {configs
                          .filter(
                            (cfg) =>
                              !conns.some(
                                (c) =>
                                  getConfigById(c.configId)?.id === cfg.id ||
                                  c.configId === cfg.id
                              )
                          )
                          .map((config) => {
                            const ConfigIcon = config.icon;
                            return (
                            <div
                              key={config.id}
                              className="flex items-center justify-between rounded-md bg-[var(--brand-surface-alt)] px-4 py-3 opacity-75"
                            >
                              <div className="flex items-center gap-3">
                                <ConfigIcon className="h-5 w-5 shrink-0 text-[var(--brand-text-muted)]" />
                                <span className="font-medium text-sm text-[var(--brand-text-muted)]">
                                  {config.name}
                                </span>
                                <BrandBadge tone="default">Disconnected</BrandBadge>
                              </div>
                              <BrandButton
                                variant="secondary"
                                size="sm"
                                onClick={() => handleConnect(provider, config.service)}
                                disabled={!!actionId}
                              >
                                Connect
                              </BrandButton>
                            </div>
                            );
                          })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
