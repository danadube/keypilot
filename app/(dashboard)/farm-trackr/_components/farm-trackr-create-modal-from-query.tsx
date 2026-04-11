"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { BrandModal } from "@/components/ui/BrandModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { kpBtnPrimary, kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";

type TerritoryOpt = { id: string; name: string };

type Props = {
  onCreated: () => void;
};

export function FarmTrackrCreateModalFromQuery({ onCreated }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const mode = searchParams.get("create");
  const open = mode === "territory" || mode === "area";

  const [territoryName, setTerritoryName] = useState("");
  const [areaName, setAreaName] = useState("");
  const [territoryId, setTerritoryId] = useState("");
  const [territories, setTerritories] = useState<TerritoryOpt[]>([]);
  const [loadingTerritories, setLoadingTerritories] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const dismiss = useCallback(() => {
    router.replace("/farm-trackr", { scroll: false });
  }, [router]);

  useEffect(() => {
    if (!open || mode !== "area") return;
    let cancelled = false;
    setLoadingTerritories(true);
    void fetch("/api/v1/farm-territories?visibility=active")
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        const list = (json?.data as TerritoryOpt[]) ?? [];
        setTerritories(list);
        setTerritoryId((cur) => {
          if (cur && list.some((t) => t.id === cur)) return cur;
          return list[0]?.id ?? "";
        });
      })
      .finally(() => {
        if (!cancelled) setLoadingTerritories(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, mode]);

  useEffect(() => {
    if (!open) {
      setTerritoryName("");
      setAreaName("");
      setTerritoryId("");
      setLocalError(null);
    }
  }, [open]);

  const submitTerritory = async () => {
    const name = territoryName.trim();
    if (!name || busy) return;
    setBusy(true);
    setLocalError(null);
    try {
      const res = await fetch("/api/v1/farm-territories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message ?? "Failed to create territory");
      onCreated();
      dismiss();
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Failed to create territory");
    } finally {
      setBusy(false);
    }
  };

  const submitArea = async () => {
    const name = areaName.trim();
    if (!name || !territoryId || busy) return;
    setBusy(true);
    setLocalError(null);
    try {
      const res = await fetch("/api/v1/farm-areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ territoryId, name }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message ?? "Failed to create farm area");
      onCreated();
      dismiss();
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Failed to create farm area");
    } finally {
      setBusy(false);
    }
  };

  if (mode === "territory") {
    return (
      <BrandModal
        open={open}
        onOpenChange={(next) => {
          if (!next) dismiss();
        }}
        title="New territory"
        description="Add a territory, then create farm areas inside it."
        size="sm"
      >
        <div className="space-y-3">
          {localError ? (
            <p className="text-xs text-red-300" role="alert">
              {localError}
            </p>
          ) : null}
          <Input
            value={territoryName}
            onChange={(e) => setTerritoryName(e.target.value)}
            placeholder="Territory name"
            className="h-9 border-kp-outline bg-kp-surface-high text-kp-on-surface"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") void submitTerritory();
            }}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" className={cn(kpBtnSecondary)} onClick={dismiss}>
              Cancel
            </Button>
            <Button
              type="button"
              className={cn(kpBtnPrimary)}
              disabled={!territoryName.trim() || busy}
              onClick={() => void submitTerritory()}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
            </Button>
          </div>
        </div>
      </BrandModal>
    );
  }

  if (mode === "area") {
    return (
      <BrandModal
        open={open}
        onOpenChange={(next) => {
          if (!next) dismiss();
        }}
        title="New farm area"
        description="Choose a territory and name the area."
        size="sm"
      >
        <div className="space-y-3">
          {localError ? (
            <p className="text-xs text-red-300" role="alert">
              {localError}
            </p>
          ) : null}
          {loadingTerritories ? (
            <div className="flex items-center gap-2 text-xs text-kp-on-surface-variant">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading territories…
            </div>
          ) : (
            <select
              value={territoryId}
              onChange={(e) => setTerritoryId(e.target.value)}
              disabled={territories.length === 0}
              className="h-9 w-full rounded-md border border-kp-outline bg-kp-surface-high px-3 text-sm text-kp-on-surface"
            >
              {territories.length === 0 ? (
                <option value="">No active territories — create a territory first</option>
              ) : (
                territories.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))
              )}
            </select>
          )}
          <Input
            value={areaName}
            onChange={(e) => setAreaName(e.target.value)}
            placeholder="Farm area name"
            className="h-9 border-kp-outline bg-kp-surface-high text-kp-on-surface"
            disabled={territories.length === 0}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submitArea();
            }}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" className={cn(kpBtnSecondary)} onClick={dismiss}>
              Cancel
            </Button>
            <Button
              type="button"
              className={cn(kpBtnPrimary)}
              disabled={!areaName.trim() || !territoryId || busy}
              onClick={() => void submitArea()}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
            </Button>
          </div>
        </div>
      </BrandModal>
    );
  }

  return null;
}
