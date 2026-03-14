"use client";

import { type ConnectionState } from "@/lib/connections";
import { BrandBadge } from "@/components/ui/BrandBadge";
import { BrandButton } from "@/components/ui/BrandButton";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<ConnectionState["status"], "default" | "success" | "warning" | "danger"> = {
  disconnected: "default",
  connected: "success",
  pending: "warning",
  error: "danger",
};

const STATUS_LABEL: Record<ConnectionState["status"], string> = {
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

export interface ConnectionCardProps {
  state: ConnectionState;
  onConnect: () => void;
  onDisconnect: () => void;
  isConnecting?: boolean;
  isDisconnecting?: boolean;
}

export function ConnectionCard({
  state,
  onConnect,
  onDisconnect,
  isConnecting,
  isDisconnecting,
}: ConnectionCardProps) {
  const Icon = state.config.icon;
  const statusTone = STATUS_TONE[state.status];
  const statusLabel = STATUS_LABEL[state.status];
  const lastSync = formatRelativeTime(state.lastSyncAt);

  const isConnected = state.status === "connected";

  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-[var(--brand-border)] bg-[var(--brand-surface)] p-6 transition-shadow hover:shadow-[0_1px_3px_0_rgb(0_0_0_/0.06)]"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--brand-surface-alt)] text-[var(--brand-text-muted)]">
            <Icon className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-[var(--brand-text)]">{state.config.name}</h3>
            <p className="text-sm text-[var(--brand-text-muted)] mt-0.5">{state.config.description}</p>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <BrandBadge tone={statusTone}>{statusLabel}</BrandBadge>
              {lastSync && isConnected && (
                <span className="text-xs text-[var(--brand-text-muted)]">Last sync: {lastSync}</span>
              )}
              {state.errorMessage && (
                <span className="text-xs text-[var(--brand-danger)]">{state.errorMessage}</span>
              )}
            </div>
          </div>
        </div>
        <div className="shrink-0">
          {isConnected ? (
            <BrandButton
              variant="ghost"
              size="sm"
              onClick={onDisconnect}
              disabled={isDisconnecting}
            >
              {isDisconnecting ? "Disconnecting…" : "Disconnect"}
            </BrandButton>
          ) : (
            <BrandButton
              variant="accent"
              size="sm"
              onClick={onConnect}
              disabled={isConnecting}
            >
              {isConnecting ? "Connecting…" : "Connect"}
            </BrandButton>
          )}
        </div>
      </div>
    </div>
  );
}
