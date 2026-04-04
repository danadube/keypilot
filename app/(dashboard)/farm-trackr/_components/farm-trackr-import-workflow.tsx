"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ChevronDown, ChevronRight, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  kpBtnPrimary,
  kpBtnSecondary,
} from "@/components/ui/kp-dashboard-button-tiers";
import { cn } from "@/lib/utils";

export type ImportDataSet = {
  headers: string[];
  rows: Record<string, string>[];
  rowCount: number;
};

export type ImportMapping = {
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  territory: string | null;
  area: string | null;
};

export type ImportPreviewRow = {
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

export type ImportSummary = {
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

export type ImportStage = "upload" | "mapping" | "validation" | "executing" | "complete";

/** Aggregated shape of workflow state (implemented with discrete useState hooks). */
export type ImportWorkflowState = {
  stage: ImportStage;
  fileMeta: { name: string; format: "csv" } | null;
  dataset: ImportDataSet | null;
  mapping: ImportMapping;
  defaultTerritoryName: string;
  defaultAreaName: string;
  previewRows: ImportPreviewRow[];
  previewSummary: ImportSummary | null;
  lastPreviewAt: number | null;
  importResultSummary: ImportSummary | null;
  importError: string | null;
  importBusy: "parse" | "preview" | "apply" | null;
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

function rowIssueTone(status: ImportPreviewRow["status"]): string {
  if (status === "skipped") return "text-amber-200/90";
  return "";
}

function mappingFingerprint(
  mapping: ImportMapping,
  defaultTerritoryName: string,
  defaultAreaName: string
): string {
  return JSON.stringify({
    mapping,
    defaultTerritoryName: defaultTerritoryName.trim(),
    defaultAreaName: defaultAreaName.trim(),
  });
}

export function FarmTrackrImportWorkflow({ onApplySuccess }: { onApplySuccess?: () => void }) {
  const [stage, setStage] = useState<ImportStage>("upload");
  const [fileMeta, setFileMeta] = useState<{ name: string; format: "csv" } | null>(null);
  const [dataset, setDataset] = useState<ImportDataSet | null>(null);
  const [mapping, setMapping] = useState<ImportMapping>(EMPTY_MAPPING);
  const [defaultTerritoryName, setDefaultTerritoryName] = useState("");
  const [defaultAreaName, setDefaultAreaName] = useState("");
  const [previewRows, setPreviewRows] = useState<ImportPreviewRow[]>([]);
  const [previewSummary, setPreviewSummary] = useState<ImportSummary | null>(null);
  const [lastPreviewAt, setLastPreviewAt] = useState<number | null>(null);
  const [previewFingerprintAtPreview, setPreviewFingerprintAtPreview] = useState<string | null>(null);
  const [importResultSummary, setImportResultSummary] = useState<ImportSummary | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importBusy, setImportBusy] = useState<"parse" | "preview" | "apply" | null>(null);
  const [showRawPreview, setShowRawPreview] = useState(false);

  const currentFingerprint = useMemo(
    () => mappingFingerprint(mapping, defaultTerritoryName, defaultAreaName),
    [mapping, defaultTerritoryName, defaultAreaName]
  );

  const importHeaders = dataset?.headers ?? [];

  const canRunPreview = useMemo(
    () =>
      Boolean(dataset?.rows.length) &&
      Boolean(
        mapping.email ||
          mapping.phone ||
          mapping.fullName ||
          (mapping.firstName && mapping.lastName)
      ) &&
      Boolean(mapping.area || defaultAreaName.trim()) &&
      Boolean(mapping.territory || defaultTerritoryName.trim()),
    [dataset, mapping, defaultTerritoryName, defaultAreaName]
  );

  const previewIsFresh =
    previewFingerprintAtPreview !== null &&
    previewFingerprintAtPreview === currentFingerprint &&
    previewRows.length > 0 &&
    lastPreviewAt !== null;

  const clearPreview = useCallback(() => {
    setPreviewRows([]);
    setPreviewSummary(null);
    setLastPreviewAt(null);
    setPreviewFingerprintAtPreview(null);
    setImportResultSummary(null);
  }, []);

  const resetToUpload = useCallback(() => {
    setStage("upload");
    setFileMeta(null);
    setDataset(null);
    setMapping(EMPTY_MAPPING);
    setDefaultTerritoryName("");
    setDefaultAreaName("");
    clearPreview();
    setImportError(null);
    setImportBusy(null);
    setShowRawPreview(false);
  }, [clearPreview]);

  /** New file = new dataset → always invalidate preview */
  const handleParseCsv = async (file: File) => {
    setImportError(null);
    clearPreview();
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
      const data = json.data as ImportDataSet;
      setDataset(data);
      setFileMeta({ name: file.name, format: "csv" });
      const headers: string[] = data.headers ?? [];
      setMapping(inferMappingFromHeaders(headers));
      setStage("mapping");
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Failed to parse CSV");
    } finally {
      setImportBusy(null);
    }
  };

  const runPreview = useCallback(async () => {
    if (!dataset) return;
    setImportBusy("preview");
    setImportError(null);
    setImportResultSummary(null);
    try {
      const res = await fetch("/api/v1/farm-imports/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: dataset.rows,
          mapping,
          defaultTerritoryName: defaultTerritoryName.trim() || null,
          defaultAreaName: defaultAreaName.trim() || null,
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message ?? "Failed to preview import");
      setPreviewRows(json.data.rows ?? []);
      setPreviewSummary(json.data.summary ?? null);
      setPreviewFingerprintAtPreview(currentFingerprint);
      setLastPreviewAt(Date.now());
      setStage("validation");
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Failed to preview import");
    } finally {
      setImportBusy(null);
    }
  }, [dataset, mapping, defaultTerritoryName, defaultAreaName, currentFingerprint]);

  const applyImport = useCallback(async () => {
    if (!dataset || !previewIsFresh) return;
    setStage("executing");
    setImportBusy("apply");
    setImportError(null);
    try {
      const res = await fetch("/api/v1/farm-imports/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: dataset.rows,
          mapping,
          defaultTerritoryName: defaultTerritoryName.trim() || null,
          defaultAreaName: defaultAreaName.trim() || null,
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message ?? "Failed to apply import");
      setImportResultSummary(json.data.summary ?? null);
      setPreviewRows(json.data.rows ?? []);
      setPreviewSummary(json.data.summary ?? null);
      onApplySuccess?.();
      setStage("complete");
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Failed to apply import");
      setStage("validation");
    } finally {
      setImportBusy(null);
    }
  }, [
    dataset,
    mapping,
    defaultTerritoryName,
    defaultAreaName,
    previewIsFresh,
    onApplySuccess,
  ]);

  useEffect(() => {
    if (previewFingerprintAtPreview === null) return;
    if (currentFingerprint === previewFingerprintAtPreview) return;
    setPreviewRows([]);
    setPreviewSummary(null);
    setLastPreviewAt(null);
    setPreviewFingerprintAtPreview(null);
    setImportResultSummary(null);
    if (stage === "validation") setStage("mapping");
  }, [currentFingerprint, previewFingerprintAtPreview, stage]);

  const mappingGuardHint = !canRunPreview && dataset
    ? "Map at least one contact identifier (email, phone, or first+last name or full name) and territory/area (column or default)."
    : null;

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-kp-on-surface">
            Multi-source farm import (foundation)
          </h2>
          <p className="mt-1 text-xs text-kp-on-surface-variant">
            CSV import: upload, map columns, validate with preview, then apply. Up to 1000 rows per
            import.
          </p>
        </div>
        <p className="text-xs text-kp-on-surface-muted">
          {stage === "upload" && "Step 1 · Upload"}
          {stage === "mapping" && "Step 2 · Map fields"}
          {stage === "validation" && "Step 3 · Validate"}
          {stage === "executing" && "Applying…"}
          {stage === "complete" && "Done"}
        </p>
      </div>

      <div className="mt-4 space-y-3">
        {importError ? (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {importError}
          </div>
        ) : null}

        {stage === "upload" ? (
          <div className="rounded-lg border border-kp-outline bg-kp-surface-high p-3">
            <label className="text-xs font-medium text-kp-on-surface">Upload CSV</label>
            <div className="mt-2">
              <input
                type="file"
                accept=".csv,text/csv"
                disabled={importBusy === "parse"}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleParseCsv(file);
                  e.target.value = "";
                }}
                className="block w-full text-xs text-kp-on-surface file:mr-2 file:rounded file:border file:border-kp-outline file:bg-kp-surface file:px-2 file:py-1 file:text-xs"
              />
            </div>
            {importBusy === "parse" ? (
              <p className="mt-2 flex items-center gap-2 text-xs text-kp-on-surface-variant">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Parsing…
              </p>
            ) : null}
          </div>
        ) : null}

        {(stage === "mapping" || stage === "validation") && dataset ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-kp-outline bg-kp-surface-high p-3 text-xs text-kp-on-surface-variant">
              <span className="text-kp-on-surface">{fileMeta?.name ?? "File"}</span>
              {" · "}
              {dataset.rowCount} rows ({dataset.headers.length} columns)
              {stage === "mapping" ? (
                <button
                  type="button"
                  className="ml-2 font-medium text-kp-teal underline-offset-2 hover:underline"
                  onClick={() => resetToUpload()}
                >
                  Change file
                </button>
              ) : null}
            </div>

            {stage === "mapping" ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowRawPreview((v) => !v)}
                  className="flex items-center gap-1 text-xs font-medium text-kp-on-surface-variant hover:text-kp-on-surface"
                >
                  {showRawPreview ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                  Raw data preview (first 20 rows)
                </button>
                {showRawPreview ? (
                  <div className="overflow-x-auto rounded-lg border border-kp-outline">
                    <table className="w-full text-left text-[11px] text-kp-on-surface">
                      <thead className="bg-kp-surface-high text-kp-on-surface-variant">
                        <tr>
                          {importHeaders.map((h) => (
                            <th key={h} className="whitespace-nowrap px-2 py-1.5">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {dataset.rows.slice(0, 20).map((row, i) => (
                          <tr key={i} className="border-t border-kp-outline">
                            {importHeaders.map((h) => (
                              <td key={h} className="max-w-[140px] truncate px-2 py-1.5">
                                {row[h] ?? ""}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {MAPPING_FIELDS.map((field) => (
                    <label key={field.key} className="space-y-1">
                      <span className="text-xs text-kp-on-surface-variant">{field.label}</span>
                      <select
                        value={mapping[field.key] ?? ""}
                        onChange={(e) =>
                          setMapping((prev) => ({
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

                {mappingGuardHint ? (
                  <p className="text-xs text-amber-200/90">{mappingGuardHint}</p>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    className={cn(kpBtnPrimary, "h-9 border-transparent px-3 text-xs")}
                    onClick={() => void runPreview()}
                    disabled={!canRunPreview || importBusy !== null}
                  >
                    {importBusy === "preview" ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Previewing…
                      </>
                    ) : (
                      <>
                        <Upload className="mr-1.5 h-3.5 w-3.5" />
                        Next: preview import
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : null}

            {stage === "validation" ? (
              <>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(kpBtnSecondary, "h-9 border-transparent px-3 text-xs")}
                    onClick={() => setStage("mapping")}
                    disabled={importBusy !== null}
                  >
                    Back to mapping
                  </Button>
                  <Button
                    type="button"
                    className={cn(kpBtnPrimary, "h-9 border-transparent px-3 text-xs")}
                    onClick={() => void applyImport()}
                    disabled={!previewIsFresh || importBusy !== null}
                  >
                    Apply import
                  </Button>
                </div>
                {stage === "validation" && !previewIsFresh ? (
                  <p className="text-xs text-amber-200/90">
                    Run preview again after changing mapping or defaults.
                  </p>
                ) : null}
              </>
            ) : null}

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

            {previewRows.length > 0 && (stage === "validation" || stage === "mapping") ? (
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
                        <td className={cn("px-3 py-2", rowIssueTone(row.status))}>
                          {renderRowStatus(row.status)}
                        </td>
                        <td className="px-3 py-2">
                          {row.email ||
                            [row.firstName, row.lastName].filter(Boolean).join(" ") ||
                            "Unknown"}
                        </td>
                        <td className="px-3 py-2">
                          {[row.territoryName, row.areaName].filter(Boolean).join(" / ") ||
                            "Not resolved"}
                        </td>
                        <td className="px-3 py-2 text-kp-on-surface-variant">
                          {row.reason ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewRows.length > 50 ? (
                  <p className="border-t border-kp-outline px-3 py-2 text-[11px] text-kp-on-surface-variant">
                    Showing 50 of {previewRows.length} preview rows.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {stage === "executing" ? (
          <div className="flex items-center gap-2 rounded-lg border border-kp-outline bg-kp-surface-high px-4 py-6 text-sm text-kp-on-surface-variant">
            <Loader2 className="h-5 w-5 animate-spin shrink-0" />
            Applying import…
          </div>
        ) : null}

        {stage === "complete" && importResultSummary ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-3 text-xs text-emerald-200">
              <p className="font-medium text-emerald-100">Import complete</p>
              <p className="mt-2 text-emerald-200/90">
                {importResultSummary.createdContacts} contacts created ·{" "}
                {importResultSummary.createdMemberships} memberships created ·{" "}
                {importResultSummary.reactivatedMemberships} memberships reactivated ·{" "}
                {importResultSummary.skippedRows} rows skipped.
              </p>
              <div className="mt-3 grid gap-1 text-[11px] text-emerald-200/80 sm:grid-cols-2">
                <span>Territories created: {importResultSummary.createdTerritories}</span>
                <span>Areas created: {importResultSummary.createdAreas}</span>
                <span>Matched contacts: {importResultSummary.matchedContacts}</span>
                <span>Total rows: {importResultSummary.totalRows}</span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className={cn(kpBtnSecondary, "h-9 px-3 text-xs")}
              onClick={() => resetToUpload()}
            >
              Import another file
            </Button>
          </div>
        ) : null}
      </div>
    </>
  );
}
