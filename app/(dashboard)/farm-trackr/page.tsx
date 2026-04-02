"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ModuleGate } from "@/components/shared/ModuleGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  kpBtnPrimary,
  kpBtnSecondary,
} from "@/components/ui/kp-dashboard-button-tiers";
import { AlertCircle, Loader2, Mail, MapPinned, Printer, Upload } from "lucide-react";
import { buildMailingListCsv } from "@/lib/farm/mailing/mailing-list-csv";
import { FarmAreaMembersBulkPanel } from "./_components/farm-area-members-bulk-panel";

type Territory = {
  id: string;
  name: string;
  description: string | null;
  areaCount: number;
};

type FarmArea = {
  id: string;
  name: string;
  description: string | null;
  territoryId: string;
  territory: { id: string; name: string };
  membershipCount: number;
};

type ImportSource = "csv" | "google_sheets";

type ImportDataSet = {
  headers: string[];
  rows: Record<string, string>[];
  rowCount: number;
};

type ImportMapping = {
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  territory: string | null;
  area: string | null;
};

type ImportPreviewRow = {
  rowNumber: number;
  status:
    | "matched"
    | "create_contact"
    | "reactivate_membership"
    | "create_membership"
    | "already_member"
    | "skipped";
  reason?: string;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  territoryName: string | null;
  areaName: string | null;
  matchedContactId: string | null;
  matchedBy: "email" | "phone" | "name" | null;
  willCreateTerritory: boolean;
  willReactivateTerritory: boolean;
  willCreateArea: boolean;
  willReactivateArea: boolean;
};

type ImportSummary = {
  totalRows: number;
  matchedContacts: number;
  createdContacts: number;
  reactivatedContacts: number;
  createdMemberships: number;
  reactivatedMemberships: number;
  skippedRows: number;
  createdTerritories: number;
  reactivatedTerritories: number;
  createdAreas: number;
  reactivatedAreas: number;
};

const EMPTY_MAPPING: ImportMapping = {
  email: null,
  phone: null,
  firstName: null,
  lastName: null,
  fullName: null,
  territory: null,
  area: null,
};

const MAPPING_FIELDS: { key: keyof ImportMapping; label: string }[] = [
  { key: "email", label: "Email (preferred)" },
  { key: "phone", label: "Phone (secondary)" },
  { key: "firstName", label: "First name" },
  { key: "lastName", label: "Last name" },
  { key: "fullName", label: "Full name" },
  { key: "territory", label: "Territory" },
  { key: "area", label: "Farm area" },
];

export default function FarmTrackrPage() {
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [areas, setAreas] = useState<FarmArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newTerritoryName, setNewTerritoryName] = useState("");
  const [newAreaName, setNewAreaName] = useState("");
  const [newAreaTerritoryId, setNewAreaTerritoryId] = useState("");

  const [busyTerritoryId, setBusyTerritoryId] = useState<string | null>(null);
  const [busyAreaId, setBusyAreaId] = useState<string | null>(null);
  const [creatingTerritory, setCreatingTerritory] = useState(false);
  const [creatingArea, setCreatingArea] = useState(false);

  const [editingTerritoryId, setEditingTerritoryId] = useState<string | null>(null);
  const [editingTerritoryName, setEditingTerritoryName] = useState("");
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
  const [editingAreaName, setEditingAreaName] = useState("");

  const [importSource, setImportSource] = useState<ImportSource>("csv");
  const [importData, setImportData] = useState<ImportDataSet | null>(null);
  const [importMapping, setImportMapping] = useState<ImportMapping>(EMPTY_MAPPING);
  const [defaultTerritoryName, setDefaultTerritoryName] = useState("");
  const [defaultAreaName, setDefaultAreaName] = useState("");
  const [previewRows, setPreviewRows] = useState<ImportPreviewRow[]>([]);
  const [previewSummary, setPreviewSummary] = useState<ImportSummary | null>(null);
  const [importBusy, setImportBusy] = useState<"parse" | "preview" | "apply" | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResultSummary, setImportResultSummary] = useState<ImportSummary | null>(null);
  const [sheetsSpreadsheetId, setSheetsSpreadsheetId] = useState("");
  const [sheetsRange, setSheetsRange] = useState("Sheet1!A1:Z");

  const [expandedMemberAreaId, setExpandedMemberAreaId] = useState<string | null>(null);
  const [mailingScope, setMailingScope] = useState<"territory" | "area">("territory");
  const [mailingTerritoryId, setMailingTerritoryId] = useState("");
  const [mailingAreaId, setMailingAreaId] = useState("");
  const [mailingBusy, setMailingBusy] = useState<"csv" | "print" | null>(null);
  const [mailingHint, setMailingHint] = useState<string | null>(null);

  const loadData = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([fetch("/api/v1/farm-territories"), fetch("/api/v1/farm-areas")])
      .then(async ([territoryRes, areaRes]) => {
        const territoryJson = await territoryRes.json();
        const areaJson = await areaRes.json();
        if (territoryJson.error) throw new Error(territoryJson.error.message);
        if (areaJson.error) throw new Error(areaJson.error.message);
        setTerritories(territoryJson.data ?? []);
        setAreas(areaJson.data ?? []);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load farm management")
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const areasByTerritoryId = useMemo(() => {
    const byTerritory = new Map<string, FarmArea[]>();
    for (const area of areas) {
      byTerritory.set(area.territoryId, [...(byTerritory.get(area.territoryId) ?? []), area]);
    }
    return byTerritory;
  }, [areas]);

  const handleCreateTerritory = async () => {
    if (!newTerritoryName.trim() || creatingTerritory) return;
    setCreatingTerritory(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/farm-territories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTerritoryName.trim() }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message ?? "Failed to create territory");
      setTerritories((prev) => [...prev, json.data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewTerritoryName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create territory");
    } finally {
      setCreatingTerritory(false);
    }
  };

  const handleCreateArea = async () => {
    if (!newAreaName.trim() || !newAreaTerritoryId || creatingArea) return;
    setCreatingArea(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/farm-areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          territoryId: newAreaTerritoryId,
          name: newAreaName.trim(),
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message ?? "Failed to create farm area");
      setAreas((prev) =>
        [...prev, json.data].sort((a, b) =>
          `${a.territory.name} ${a.name}`.localeCompare(`${b.territory.name} ${b.name}`)
        )
      );
      setTerritories((prev) =>
        prev.map((territory) =>
          territory.id === newAreaTerritoryId
            ? { ...territory, areaCount: territory.areaCount + 1 }
            : territory
        )
      );
      setNewAreaName("");
      setNewAreaTerritoryId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create farm area");
    } finally {
      setCreatingArea(false);
    }
  };

  const saveTerritoryName = async (territoryId: string) => {
    if (!editingTerritoryName.trim() || busyTerritoryId) return;
    setBusyTerritoryId(territoryId);
    setError(null);
    try {
      const res = await fetch(`/api/v1/farm-territories/${territoryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingTerritoryName.trim() }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message ?? "Failed to update territory");
      setTerritories((prev) => prev.map((t) => (t.id === territoryId ? json.data : t)));
      setEditingTerritoryId(null);
      setEditingTerritoryName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update territory");
    } finally {
      setBusyTerritoryId(null);
    }
  };

  const archiveTerritory = async (territoryId: string) => {
    if (!confirm("Archive this territory and its areas?")) return;
    setBusyTerritoryId(territoryId);
    setError(null);
    try {
      const res = await fetch(`/api/v1/farm-territories/${territoryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archive: true }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message ?? "Failed to archive territory");
      setTerritories((prev) => prev.filter((t) => t.id !== territoryId));
      setAreas((prev) => prev.filter((a) => a.territoryId !== territoryId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive territory");
    } finally {
      setBusyTerritoryId(null);
    }
  };

  const saveAreaName = async (areaId: string) => {
    if (!editingAreaName.trim() || busyAreaId) return;
    setBusyAreaId(areaId);
    setError(null);
    try {
      const res = await fetch(`/api/v1/farm-areas/${areaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingAreaName.trim() }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message ?? "Failed to update farm area");
      setAreas((prev) => prev.map((a) => (a.id === areaId ? json.data : a)));
      setEditingAreaId(null);
      setEditingAreaName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update farm area");
    } finally {
      setBusyAreaId(null);
    }
  };

  const archiveArea = async (areaId: string) => {
    if (!confirm("Archive this farm area?")) return;
    const area = areas.find((entry) => entry.id === areaId);
    if (!area) return;
    setBusyAreaId(areaId);
    setError(null);
    try {
      const res = await fetch(`/api/v1/farm-areas/${areaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archive: true }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message ?? "Failed to archive farm area");
      setAreas((prev) => prev.filter((entry) => entry.id !== areaId));
      setTerritories((prev) =>
        prev.map((territory) =>
          territory.id === area.territoryId
            ? { ...territory, areaCount: Math.max(0, territory.areaCount - 1) }
            : territory
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive farm area");
    } finally {
      setBusyAreaId(null);
    }
  };

  const importHeaders = importData?.headers ?? [];
  const canPreviewImport =
    Boolean(importData?.rows.length) &&
    Boolean(importMapping.email || importMapping.phone || importMapping.fullName || (importMapping.firstName && importMapping.lastName)) &&
    Boolean(importMapping.area || defaultAreaName.trim()) &&
    Boolean(importMapping.territory || defaultTerritoryName.trim());

  const resetImportReview = () => {
    setPreviewRows([]);
    setPreviewSummary(null);
    setImportResultSummary(null);
  };

  const parseCsvFile = async (file: File) => {
    setImportError(null);
    resetImportReview();
    setImportBusy("parse");
    try {
      const csvText = await file.text();
      const res = await fetch("/api/v1/farm-imports/csv/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message ?? "Failed to parse CSV");
      setImportData(json.data);
      const headers: string[] = json.data.headers ?? [];
      setImportMapping(inferMappingFromHeaders(headers));
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Failed to parse CSV");
    } finally {
      setImportBusy(null);
    }
  };

  const fetchGoogleSheet = async () => {
    setImportError(null);
    resetImportReview();
    setImportBusy("parse");
    try {
      const res = await fetch("/api/v1/farm-imports/google-sheets/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spreadsheetId: sheetsSpreadsheetId.trim(),
          range: sheetsRange.trim(),
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message ?? "Failed to fetch Google Sheet");
      setImportData(json.data);
      const headers: string[] = json.data.headers ?? [];
      setImportMapping(inferMappingFromHeaders(headers));
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Failed to fetch Google Sheet");
    } finally {
      setImportBusy(null);
    }
  };

  const runPreview = async () => {
    if (!importData) return;
    setImportBusy("preview");
    setImportError(null);
    setImportResultSummary(null);
    try {
      const res = await fetch("/api/v1/farm-imports/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: importData.rows,
          mapping: importMapping,
          defaultTerritoryName: defaultTerritoryName.trim() || null,
          defaultAreaName: defaultAreaName.trim() || null,
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message ?? "Failed to preview import");
      setPreviewRows(json.data.rows ?? []);
      setPreviewSummary(json.data.summary ?? null);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Failed to preview import");
    } finally {
      setImportBusy(null);
    }
  };

  const applyImport = async () => {
    if (!importData) return;
    setImportBusy("apply");
    setImportError(null);
    try {
      const res = await fetch("/api/v1/farm-imports/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: importData.rows,
          mapping: importMapping,
          defaultTerritoryName: defaultTerritoryName.trim() || null,
          defaultAreaName: defaultAreaName.trim() || null,
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message ?? "Failed to apply import");
      setImportResultSummary(json.data.summary ?? null);
      setPreviewRows(json.data.rows ?? []);
      setPreviewSummary(json.data.summary ?? null);
      loadData();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Failed to apply import");
    } finally {
      setImportBusy(null);
    }
  };

  const mailingQuerySuffix =
    mailingScope === "territory"
      ? mailingTerritoryId
        ? `territoryId=${encodeURIComponent(mailingTerritoryId)}`
        : ""
      : mailingAreaId
        ? `farmAreaId=${encodeURIComponent(mailingAreaId)}`
        : "";

  const exportMailingCsv = async () => {
    if (!mailingQuerySuffix) {
      setMailingHint("Choose a territory or farm area first.");
      return;
    }
    setMailingBusy("csv");
    setMailingHint(null);
    try {
      const res = await fetch(`/api/v1/farm/mailing-recipients?${mailingQuerySuffix}&format=json`);
      const json = await res.json();
      if (json.error) throw new Error(json.error.message ?? "Export failed");
      const recipients = json.data?.recipients ?? [];
      const summary = json.data?.summary;
      const csv = buildMailingListCsv(recipients);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `farm-mailing-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      const n = summary?.contactCount ?? recipients.length;
      const p = summary?.labelPages ?? 0;
      setMailingHint(
        `${n} contact${n === 1 ? "" : "s"} · ${p} label page${p === 1 ? "" : "s"} (Avery 5160)`
      );
    } catch (e) {
      setMailingHint(e instanceof Error ? e.message : "Export failed");
    } finally {
      setMailingBusy(null);
    }
  };

  const printMailingLabels = async () => {
    if (!mailingQuerySuffix) {
      setMailingHint("Choose a territory or farm area first.");
      return;
    }
    setMailingBusy("print");
    setMailingHint(null);
    try {
      const res = await fetch(`/api/v1/farm/mailing-recipients?${mailingQuerySuffix}&format=html`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error?.message ?? "Could not build label sheet");
      }
      const html = await res.text();
      const w = window.open("", "_blank", "noopener,noreferrer");
      if (!w) {
        setMailingHint("Pop-up blocked — allow pop-ups to print labels.");
        return;
      }
      w.document.open();
      w.document.write(html);
      w.document.close();
      w.focus();
      setMailingHint("Use the preview window → File → Print (Avery 5160, no margins scaling).");
    } catch (e) {
      setMailingHint(e instanceof Error ? e.message : "Print failed");
    } finally {
      setMailingBusy(null);
    }
  };

  return (
    <ModuleGate
      moduleId="farm-trackr"
      moduleName="FarmTrackr"
      valueProposition="Geographic farming intelligence and territory management for prospecting in your farm areas."
      backHref="/showing-hq"
    >
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-xl font-bold text-kp-on-surface">FarmTrackr</h1>
          <p className="mt-1 text-sm text-kp-on-surface-variant">
            Manage territories and farm areas used by contact memberships.
          </p>
        </div>

        {error ? (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        ) : null}

        <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
          <div className="flex flex-wrap items-start gap-3">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-kp-teal" />
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-kp-on-surface">Mailing list &amp; labels</h2>
              <p className="mt-1 text-xs text-kp-on-surface-variant">
                Active memberships with a full mailing address on the contact (deduped). CSV for mail merge;
                Avery 5160 sheet for browser print.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <label className="flex items-center gap-2 text-xs text-kp-on-surface">
                  <input
                    type="radio"
                    name="mailing-scope"
                    checked={mailingScope === "territory"}
                    onChange={() => {
                      setMailingScope("territory");
                      setMailingAreaId("");
                    }}
                    className="h-3.5 w-3.5 border-kp-outline text-kp-teal"
                  />
                  Entire territory
                </label>
                <label className="flex items-center gap-2 text-xs text-kp-on-surface">
                  <input
                    type="radio"
                    name="mailing-scope"
                    checked={mailingScope === "area"}
                    onChange={() => {
                      setMailingScope("area");
                      setMailingTerritoryId("");
                    }}
                    className="h-3.5 w-3.5 border-kp-outline text-kp-teal"
                  />
                  Single farm area
                </label>
              </div>
              {mailingScope === "territory" ? (
                <select
                  value={mailingTerritoryId}
                  onChange={(e) => setMailingTerritoryId(e.target.value)}
                  disabled={loading || territories.length === 0}
                  className="mt-2 h-9 w-full max-w-md rounded-md border border-kp-outline bg-kp-surface-high px-3 text-sm text-kp-on-surface sm:w-auto"
                >
                  <option value="">Select territory…</option>
                  {territories.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={mailingAreaId}
                  onChange={(e) => setMailingAreaId(e.target.value)}
                  disabled={loading || areas.length === 0}
                  className="mt-2 h-9 w-full max-w-md rounded-md border border-kp-outline bg-kp-surface-high px-3 text-sm text-kp-on-surface sm:w-auto"
                >
                  <option value="">Select farm area…</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.territory.name} — {a.name}
                    </option>
                  ))}
                </select>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className={cn(kpBtnSecondary, "h-8 border-transparent px-3 text-xs")}
                  disabled={!!mailingBusy || loading}
                  onClick={() => void exportMailingCsv()}
                >
                  {mailingBusy === "csv" ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  Export mailing list (CSV)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(kpBtnSecondary, "h-8 border-transparent px-3 text-xs")}
                  disabled={!!mailingBusy || loading}
                  onClick={() => void printMailingLabels()}
                >
                  {mailingBusy === "print" ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Printer className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Print labels
                </Button>
              </div>
              {mailingHint ? (
                <p className="mt-2 text-xs text-kp-on-surface-variant">{mailingHint}</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-kp-on-surface">
                Multi-source farm import (foundation)
              </h2>
              <p className="mt-1 text-xs text-kp-on-surface-variant">
                Import CSV or Google Sheets rows, map fields, preview outcomes, then apply.
              </p>
            </div>
            <div className="inline-flex rounded-md border border-kp-outline bg-kp-surface-high p-1 text-xs">
              <button
                type="button"
                className={cn(
                  "rounded px-2 py-1",
                  importSource === "csv"
                    ? "bg-kp-surface text-kp-on-surface"
                    : "text-kp-on-surface-variant"
                )}
                onClick={() => {
                  setImportSource("csv");
                  setImportData(null);
                  setImportMapping(EMPTY_MAPPING);
                  resetImportReview();
                }}
              >
                CSV upload
              </button>
              <button
                type="button"
                className={cn(
                  "rounded px-2 py-1",
                  importSource === "google_sheets"
                    ? "bg-kp-surface text-kp-on-surface"
                    : "text-kp-on-surface-variant"
                )}
                onClick={() => {
                  setImportSource("google_sheets");
                  setImportData(null);
                  setImportMapping(EMPTY_MAPPING);
                  resetImportReview();
                }}
              >
                Google Sheets
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {importSource === "csv" ? (
              <div className="rounded-lg border border-kp-outline bg-kp-surface-high p-3">
                <label className="text-xs font-medium text-kp-on-surface">Upload CSV</label>
                <div className="mt-2">
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        void parseCsvFile(file);
                      }
                    }}
                    className="block w-full text-xs text-kp-on-surface file:mr-2 file:rounded file:border file:border-kp-outline file:bg-kp-surface file:px-2 file:py-1 file:text-xs"
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-kp-outline bg-kp-surface-high p-3">
                <div className="grid gap-2 sm:grid-cols-[1.2fr_1fr_auto]">
                  <Input
                    value={sheetsSpreadsheetId}
                    onChange={(e) => setSheetsSpreadsheetId(e.target.value)}
                    placeholder="Google Spreadsheet ID"
                    className="h-9 border-kp-outline bg-kp-surface text-kp-on-surface"
                  />
                  <Input
                    value={sheetsRange}
                    onChange={(e) => setSheetsRange(e.target.value)}
                    placeholder="Sheet1!A1:Z"
                    className="h-9 border-kp-outline bg-kp-surface text-kp-on-surface"
                  />
                  <Button
                    type="button"
                    className={cn(kpBtnPrimary, "h-9 border-transparent px-3 text-xs")}
                    disabled={!sheetsSpreadsheetId.trim() || !sheetsRange.trim() || importBusy === "parse"}
                    onClick={() => void fetchGoogleSheet()}
                  >
                    {importBusy === "parse" ? "Loading..." : "Load sheet"}
                  </Button>
                </div>
                <p className="mt-2 text-[11px] text-kp-on-surface-variant">
                  Uses your connected Google account from Settings &gt; Connections.
                </p>
              </div>
            )}

            {importError ? (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                <AlertCircle className="h-3.5 w-3.5" />
                {importError}
              </div>
            ) : null}

            {importData ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-kp-outline bg-kp-surface-high p-3 text-xs text-kp-on-surface-variant">
                  Loaded {importData.rowCount} rows ({importData.headers.length} columns).
                </div>

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {MAPPING_FIELDS.map((field) => (
                    <label key={field.key} className="space-y-1">
                      <span className="text-xs text-kp-on-surface-variant">{field.label}</span>
                      <select
                        value={importMapping[field.key] ?? ""}
                        onChange={(e) =>
                          setImportMapping((prev) => ({
                            ...prev,
                            [field.key]: e.target.value || null,
                          }))
                        }
                        className="h-9 w-full rounded-md border border-kp-outline bg-kp-surface px-3 text-xs text-kp-on-surface"
                      >
                        <option value="">Not mapped</option>
                        {importHeaders.map((header) => (
                          <option key={`${field.key}-${header}`} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    value={defaultTerritoryName}
                    onChange={(e) => setDefaultTerritoryName(e.target.value)}
                    placeholder="Default territory (optional if mapped)"
                    className="h-9 border-kp-outline bg-kp-surface-high text-kp-on-surface"
                  />
                  <Input
                    value={defaultAreaName}
                    onChange={(e) => setDefaultAreaName(e.target.value)}
                    placeholder="Default farm area (optional if mapped)"
                    className="h-9 border-kp-outline bg-kp-surface-high text-kp-on-surface"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    className={cn(kpBtnPrimary, "h-9 border-transparent px-3 text-xs")}
                    onClick={() => void runPreview()}
                    disabled={!canPreviewImport || importBusy !== null}
                  >
                    {importBusy === "preview" ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Previewing...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-1.5 h-3.5 w-3.5" />
                        Preview import
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    className={cn(kpBtnSecondary, "h-9 px-3 text-xs")}
                    onClick={() => void applyImport()}
                    disabled={!previewRows.length || importBusy !== null}
                  >
                    {importBusy === "apply" ? "Applying..." : "Apply import"}
                  </Button>
                </div>

                {previewSummary ? (
                  <div className="grid gap-2 rounded-lg border border-kp-outline bg-kp-surface-high p-3 text-xs text-kp-on-surface-variant sm:grid-cols-3 lg:grid-cols-5">
                    <div>Total: {previewSummary.totalRows}</div>
                    <div>Matched: {previewSummary.matchedContacts}</div>
                    <div>Create contacts: {previewSummary.createdContacts}</div>
                    <div>Create memberships: {previewSummary.createdMemberships}</div>
                    <div>Reactivate memberships: {previewSummary.reactivatedMemberships}</div>
                    <div>Skipped: {previewSummary.skippedRows}</div>
                    <div>Create territories: {previewSummary.createdTerritories}</div>
                    <div>Create areas: {previewSummary.createdAreas}</div>
                    <div>Reactivate territories: {previewSummary.reactivatedTerritories}</div>
                    <div>Reactivate areas: {previewSummary.reactivatedAreas}</div>
                  </div>
                ) : null}

                {importResultSummary ? (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                    Applied import: {importResultSummary.createdContacts} contacts created,{" "}
                    {importResultSummary.createdMemberships} memberships created,{" "}
                    {importResultSummary.reactivatedMemberships} memberships reactivated,{" "}
                    {importResultSummary.skippedRows} rows skipped.
                  </div>
                ) : null}

                {previewRows.length > 0 ? (
                  <div className="overflow-x-auto rounded-lg border border-kp-outline">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-kp-surface-high text-kp-on-surface-variant">
                        <tr>
                          <th className="px-3 py-2">Row</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2">Contact</th>
                          <th className="px-3 py-2">Territory / Area</th>
                          <th className="px-3 py-2">Reason</th>
                        </tr>
                      </thead>
                      <tbody className="bg-kp-surface text-kp-on-surface">
                        {previewRows.slice(0, 50).map((row) => (
                          <tr key={`import-row-${row.rowNumber}`} className="border-t border-kp-outline">
                            <td className="px-3 py-2">{row.rowNumber}</td>
                            <td className="px-3 py-2">{renderRowStatus(row.status)}</td>
                            <td className="px-3 py-2">
                              {row.email || [row.firstName, row.lastName].filter(Boolean).join(" ") || "Unknown"}
                            </td>
                            <td className="px-3 py-2">
                              {[row.territoryName, row.areaName].filter(Boolean).join(" / ") || "Not resolved"}
                            </td>
                            <td className="px-3 py-2 text-kp-on-surface-variant">{row.reason ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
            <h2 className="text-sm font-semibold text-kp-on-surface">Create territory</h2>
            <div className="mt-3 flex gap-2">
              <Input
                value={newTerritoryName}
                onChange={(e) => setNewTerritoryName(e.target.value)}
                placeholder="e.g. South Palm Springs"
                className="h-9 border-kp-outline bg-kp-surface-high text-kp-on-surface"
              />
              <Button
                type="button"
                className={cn(kpBtnPrimary, "h-9 border-transparent px-3 text-xs")}
                onClick={() => void handleCreateTerritory()}
                disabled={!newTerritoryName.trim() || creatingTerritory}
              >
                {creatingTerritory ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
            <h2 className="text-sm font-semibold text-kp-on-surface">Create farm area</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <select
                value={newAreaTerritoryId}
                onChange={(e) => setNewAreaTerritoryId(e.target.value)}
                className="h-9 rounded-md border border-kp-outline bg-kp-surface-high px-3 text-sm text-kp-on-surface"
              >
                <option value="">Select territory</option>
                {territories.map((territory) => (
                  <option key={territory.id} value={territory.id}>
                    {territory.name}
                  </option>
                ))}
              </select>
              <Input
                value={newAreaName}
                onChange={(e) => setNewAreaName(e.target.value)}
                placeholder="e.g. Warm Sands"
                className="h-9 border-kp-outline bg-kp-surface-high text-kp-on-surface"
              />
              <Button
                type="button"
                className={cn(kpBtnPrimary, "h-9 border-transparent px-3 text-xs")}
                onClick={() => void handleCreateArea()}
                disabled={!newAreaTerritoryId || !newAreaName.trim() || creatingArea}
              >
                {creatingArea ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center gap-2 rounded-xl border border-kp-outline bg-kp-surface px-4 py-3 text-sm text-kp-on-surface-variant">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading territories and farm areas...
            </div>
          ) : territories.length === 0 ? (
            <div className="rounded-xl border border-kp-outline bg-kp-surface p-5 text-sm text-kp-on-surface-variant">
              Create your first territory to start organizing farm areas.
            </div>
          ) : (
            territories.map((territory) => {
              const territoryAreas = areasByTerritoryId.get(territory.id) ?? [];
              const editingTerritory = editingTerritoryId === territory.id;
              return (
                <div
                  key={territory.id}
                  className="rounded-xl border border-kp-outline bg-kp-surface p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      {editingTerritory ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editingTerritoryName}
                            onChange={(e) => setEditingTerritoryName(e.target.value)}
                            className="h-8 w-[260px] border-kp-outline bg-kp-surface-high text-sm text-kp-on-surface"
                          />
                          <Button
                            type="button"
                            className={cn(kpBtnPrimary, "h-8 border-transparent px-2 text-xs")}
                            onClick={() => void saveTerritoryName(territory.id)}
                            disabled={!editingTerritoryName.trim() || busyTerritoryId === territory.id}
                          >
                            Save
                          </Button>
                        </div>
                      ) : (
                        <p className="text-sm font-semibold text-kp-on-surface">{territory.name}</p>
                      )}
                      <p className="mt-0.5 text-xs text-kp-on-surface-variant">
                        {territory.areaCount} {territory.areaCount === 1 ? "area" : "areas"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {!editingTerritory ? (
                        <Button
                          type="button"
                          variant="ghost"
                          className={cn(kpBtnSecondary, "h-8 px-2 text-xs")}
                          onClick={() => {
                            setEditingTerritoryId(territory.id);
                            setEditingTerritoryName(territory.name);
                          }}
                        >
                          Edit name
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          className={cn(kpBtnSecondary, "h-8 px-2 text-xs")}
                          onClick={() => {
                            setEditingTerritoryId(null);
                            setEditingTerritoryName("");
                          }}
                        >
                          Cancel
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        className={cn(kpBtnSecondary, "h-8 px-2 text-xs text-red-300 hover:text-red-300")}
                        onClick={() => void archiveTerritory(territory.id)}
                        disabled={busyTerritoryId === territory.id}
                      >
                        Archive
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 rounded-lg border border-kp-outline bg-kp-surface-high">
                    {territoryAreas.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-kp-on-surface-variant">
                        No active farm areas yet.
                      </div>
                    ) : (
                      territoryAreas.map((area, idx) => {
                        const editingArea = editingAreaId === area.id;
                        return (
                          <div
                            key={area.id}
                            className={cn(
                              "px-3 py-2",
                              idx > 0 && "border-t border-kp-outline"
                            )}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="min-w-0">
                              {editingArea ? (
                                <div className="flex items-center gap-2">
                                  <Input
                                    value={editingAreaName}
                                    onChange={(e) => setEditingAreaName(e.target.value)}
                                    className="h-8 w-[240px] border-kp-outline bg-kp-surface text-sm text-kp-on-surface"
                                  />
                                  <Button
                                    type="button"
                                    className={cn(kpBtnPrimary, "h-8 border-transparent px-2 text-xs")}
                                    onClick={() => void saveAreaName(area.id)}
                                    disabled={!editingAreaName.trim() || busyAreaId === area.id}
                                  >
                                    Save
                                  </Button>
                                </div>
                              ) : (
                                <p className="text-sm text-kp-on-surface">{area.name}</p>
                              )}
                              <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-kp-on-surface-variant">
                                <MapPinned className="h-3 w-3" />
                                {area.membershipCount} active{" "}
                                {area.membershipCount === 1 ? "membership" : "memberships"}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              {!editingArea ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className={cn(kpBtnSecondary, "h-8 px-2 text-xs")}
                                  onClick={() => {
                                    setEditingAreaId(area.id);
                                    setEditingAreaName(area.name);
                                  }}
                                >
                                  Edit
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className={cn(kpBtnSecondary, "h-8 px-2 text-xs")}
                                  onClick={() => {
                                    setEditingAreaId(null);
                                    setEditingAreaName("");
                                  }}
                                >
                                  Cancel
                                </Button>
                              )}
                              <Button
                                type="button"
                                variant="ghost"
                                className={cn(kpBtnSecondary, "h-8 px-2 text-xs text-red-300 hover:text-red-300")}
                                onClick={() => void archiveArea(area.id)}
                                disabled={busyAreaId === area.id}
                              >
                                Archive
                              </Button>
                            </div>
                            </div>
                          <FarmAreaMembersBulkPanel
                            areaId={area.id}
                            areaName={area.name}
                            membershipCountListed={area.membershipCount}
                            expanded={expandedMemberAreaId === area.id}
                            onToggle={() =>
                              setExpandedMemberAreaId((cur) =>
                                cur === area.id ? null : area.id
                              )
                            }
                            onMembershipsChanged={() => loadData()}
                            otherAreas={areas
                              .filter((a) => a.id !== area.id)
                              .map((a) => ({
                                id: a.id,
                                name: a.name,
                                territoryName: a.territory.name,
                              }))}
                          />
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </ModuleGate>
  );
}

function inferMappingFromHeaders(headers: string[]): ImportMapping {
  const map: ImportMapping = { ...EMPTY_MAPPING };
  for (const header of headers) {
    const key = header.trim().toLowerCase();
    if (!map.email && (key === "email" || key === "email address")) map.email = header;
    if (!map.phone && (key === "phone" || key === "mobile" || key === "phone number")) {
      map.phone = header;
    }
    if (!map.firstName && (key === "first name" || key === "firstname")) map.firstName = header;
    if (!map.lastName && (key === "last name" || key === "lastname")) map.lastName = header;
    if (!map.fullName && (key === "name" || key === "full name")) map.fullName = header;
    if (!map.territory && (key === "territory" || key === "territory name")) map.territory = header;
    if (!map.area && (key === "area" || key === "farm area" || key === "farmarea")) map.area = header;
  }
  return map;
}

function renderRowStatus(status: ImportPreviewRow["status"]): string {
  if (status === "create_contact") return "Create contact + membership";
  if (status === "create_membership") return "Create membership";
  if (status === "reactivate_membership") return "Reactivate membership";
  if (status === "already_member") return "Already active";
  if (status === "matched") return "Matched contact";
  return "Skipped";
}
