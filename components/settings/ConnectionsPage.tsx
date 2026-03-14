"use client";

import { useEffect, useState } from "react";
import { BrandSectionHeader } from "@/components/ui/BrandSectionHeader";
import { BrandCard } from "@/components/ui/BrandCard";
import { ConnectionCard } from "@/components/settings/ConnectionCard";
import { getConnectionsByProvider, PROVIDER_LABELS, type ConnectionProvider, type ConnectionState } from "@/lib/connections";
import { Loader2 } from "lucide-react";

type ApiState = {
  config: ConnectionState["config"];
  dbId: string | null;
  status: ConnectionState["status"];
  lastSyncAt: string | null;
  connectedAt: string | null;
  errorMessage?: string | null;
};

export function ConnectionsPageContent() {
  const [states, setStates] = useState<ApiState[] | null>(null);
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
        setStates(json.data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleConnect = (configId: string) => {
    setActionId(configId);
    // Placeholder: OAuth flow not implemented
    setTimeout(() => {
      setActionId(null);
      alert("Connect flow coming soon. OAuth will be implemented for real integration.");
    }, 500);
  };

  const handleDisconnect = async (dbId: string | null, configId: string) => {
    if (!dbId) return;
    setActionId(configId);
    try {
      const r = await fetch(`/api/v1/settings/connections/${dbId}`, { method: "DELETE" });
      const json = await r.json();
      if (!r.ok) throw new Error(json?.error?.message ?? "Failed to disconnect");
      load();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setActionId(null);
    }
  };

  const byProvider = getConnectionsByProvider();
  const providers: ConnectionProvider[] = ["google", "microsoft", "apple"];

  if (loading && !states) {
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
        description="Connect external services for calendar sync, email intelligence, contact sync, and AI daily briefing."
      />
      {providers.map((provider) => {
        const configs = byProvider[provider];
        return (
          <section key={provider}>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--brand-text-muted)] mb-3">
              {PROVIDER_LABELS[provider]}
            </h2>
            <div className="space-y-3">
              {configs.map((config) => {
                const apiState = states?.find(
                  (s) => s.config.id === config.id
                );
                const state: ConnectionState = apiState
                  ? { config: apiState.config, status: apiState.status, lastSyncAt: apiState.lastSyncAt, connectedAt: apiState.connectedAt, errorMessage: apiState.errorMessage }
                  : { config, status: "disconnected", lastSyncAt: null, connectedAt: null };
                const dbId = apiState?.dbId ?? null;
                const isActioning = actionId === config.id;
                return (
                  <ConnectionCard
                    key={config.id}
                    state={state}
                    onConnect={() => handleConnect(config.id)}
                    onDisconnect={() => handleDisconnect(dbId, config.id)}
                    isConnecting={isActioning}
                    isDisconnecting={isActioning}
                  />
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
