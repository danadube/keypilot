"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Bookmark,
  ChevronDown,
  ChevronRight,
  Loader2,
  Pencil,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  kpBtnPrimary,
  kpBtnSecondary,
} from "@/components/ui/kp-dashboard-button-tiers";
import { cn } from "@/lib/utils";
import {
  addImportMappingTemplate,
  applyTemplateMappingToHeaders,
  deleteImportMappingTemplateById,
  EMPTY_FARM_IMPORT_MAPPING_FIELDS,
  loadImportMappingTemplates,
  type FarmImportMappingTemplateRecord,
  type FarmImportMappingTemplateFields,
  renameImportMappingTemplate,
} from "@/lib/farm/import-mapping-templates-storage";
import {
  buildImportMappingFromHeaders,
  type ImportFieldMatchTier,
} from "@/lib/farm/import-smart-header-mapping";

export type ImportDataSet = {
  headers: string[];
  rows: Record<string, string>[];
  rowCount: number;
};

export type ImportMapping = FarmImportMappingTemplateFields;

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
  fileMeta: { name: string; format: "csv" | "xlsx" } | null;
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

const EMPTY_MAPPING: ImportMapping = { ...EMPTY_FARM_IMPORT_MAPPING_FIELDS };

type ImportMappingFieldKey = keyof ImportMapping;

const MAPPING_SECTIONS: {
  id: string;
  title: string;
  description?: string;
  fields: { key: ImportMappingFieldKey; label: string }[];
}[] = [
  {
    id: "identity",
    title: "Identity",
    description:
      "At least one identifier is required: email, a phone number, full name, or first and last name together.",
    fields: [
      { key: "firstName", label: "First name" },
      { key: "lastName", label: "Last name" },
      { key: "fullName", label: "Full name" },
    ],
  },
  {
    id: "contact",
    title: "Contact methods",
    fields: [
      { key: "email", label: "Email (primary)" },
      { key: "phone", label: "Phone (primary)" },
      { key: "phone2", label: "Alternate phone / mobile" },
      { key: "email2", label: "Alternate email" },
      { key: "email3", label: "Email 3" },
      { key: "email4", label: "Email 4" },
    ],
  },
  {
    id: "mailing",
    title: "Mailing address",
    fields: [
      { key: "mailingStreet1", label: "Street line 1" },
      { key: "mailingStreet2", label: "Street line 2" },
      { key: "mailingCity", label: "City" },
      { key: "mailingState", label: "State / province" },
      { key: "mailingZip", label: "ZIP / postal code" },
    ],
  },
  {
    id: "site",
    title: "Site address",
    description: "Property / situs location (optional; separate from mailing).",
    fields: [
      { key: "siteStreet1", label: "Street line 1" },
      { key: "siteStreet2", label: "Street line 2" },
      { key: "siteCity", label: "City" },
      { key: "siteState", label: "State / province" },
      { key: "siteZip", label: "ZIP / postal code" },
    ],
  },
  {
    id: "farm",
    title: "Farm assignment",
    description:
      "Territory and farm area are required — pick a column for each or enter defaults under the table.",
    fields: [
      { key: "territory", label: "Territory" },
      { key: "area", label: "Farm area" },
    ],
  },
  {
    id: "classification",
    title: "Classification",
    description:
      "Stage is not mapped from the file. New contacts from this import are created in CRM stage Farm (not Lead). Open-house sign-ins still default to Lead.",
    fields: [],
  },
];

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

function mappingRowStatusPill(
  fieldKey: ImportMappingFieldKey,
  mapping: ImportMapping,
  confidence: Partial<Record<ImportMappingFieldKey, ImportFieldMatchTier>>,
  defaultTerritory: string,
  defaultArea: string
): { label: string; className: string } | null {
  const col = mapping[fieldKey];
  const tier = confidence[fieldKey];
  const needsTerritory =
    fieldKey === "territory" &&
    !String(col ?? "").trim() &&
    !defaultTerritory.trim();
  const needsArea =
    fieldKey === "area" &&
    !String(col ?? "").trim() &&
    !defaultArea.trim();
  if (needsTerritory || needsArea) {
    return {
      label: "Required",
      className:
        "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-rose-500/20 text-rose-100 border border-rose-400/35",
    };
  }
  if (!String(col ?? "").trim()) return null;
  if (tier === "strong") {
    return {
      label: "Auto-mapped",
      className:
        "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-teal-500/15 text-teal-100 border border-teal-400/30",
    };
  }
  if (tier === "weak") {
    return {
      label: "Review",
      className:
        "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-amber-500/15 text-amber-100 border border-amber-400/35",
    };
  }
  return {
    label: "Set",
    className:
      "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-kp-surface-high text-kp-on-surface-variant border border-kp-outline",
  };
}

function mappingRowAccentClass(
  fieldKey: ImportMappingFieldKey,
  mapping: ImportMapping,
  confidence: Partial<Record<ImportMappingFieldKey, ImportFieldMatchTier>>,
  defaultTerritory: string,
  defaultArea: string
): string {
  const pill = mappingRowStatusPill(
    fieldKey,
    mapping,
    confidence,
    defaultTerritory,
    defaultArea
  );
  if (pill?.label === "Required") return "border-l-rose-400/85";
  const col = mapping[fieldKey];
  if (!String(col ?? "").trim()) return "border-l-transparent";
  const tier = confidence[fieldKey];
  if (tier === "strong") return "border-l-teal-400/75";
  if (tier === "weak") return "border-l-amber-400/80";
  return "border-l-kp-outline";
}

export function FarmTrackrImportWorkflow({ onApplySuccess }: { onApplySuccess?: () => void }) {
  const [stage, setStage] = useState<ImportStage>("upload");
  const [fileMeta, setFileMeta] = useState<{ name: string; format: "csv" | "xlsx" } | null>(null);
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
  const [savedTemplates, setSavedTemplates] = useState<FarmImportMappingTemplateRecord[]>([]);
  const [showTemplatesPanel, setShowTemplatesPanel] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [renamingTemplateId, setRenamingTemplateId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [templateNotice, setTemplateNotice] = useState<string | null>(null);
  const [templateSectionError, setTemplateSectionError] = useState<string | null>(null);
  const [smartMappingNotice, setSmartMappingNotice] = useState<string | null>(null);
  const [mappingConfidence, setMappingConfidence] = useState<
    Partial<Record<ImportMappingFieldKey, ImportFieldMatchTier>>
  >({});

  const currentFingerprint = useMemo(
    () => mappingFingerprint(mapping, defaultTerritoryName, defaultAreaName),
    [mapping, defaultTerritoryName, defaultAreaName]
  );

  const importHeaders = useMemo(() => dataset?.headers ?? [], [dataset?.headers]);

  const identityMapped = useMemo(
    () =>
      Boolean(
        mapping.email ||
          mapping.phone ||
          mapping.phone2 ||
          mapping.fullName ||
          (mapping.firstName && mapping.lastName)
      ),
    [mapping]
  );

  const farmMapped = useMemo(
    () =>
      Boolean(
        (mapping.territory || defaultTerritoryName.trim()) &&
          (mapping.area || defaultAreaName.trim())
      ),
    [mapping.territory, mapping.area, defaultTerritoryName, defaultAreaName]
  );

  const canRunPreview = useMemo(
    () =>
      Boolean(dataset?.rows.length) && identityMapped && farmMapped,
    [dataset?.rows.length, identityMapped, farmMapped]
  );

  const mappingSummary = useMemo(() => {
    let strong = 0;
    let weak = 0;
    for (const key of Object.keys(mapping) as ImportMappingFieldKey[]) {
      const col = mapping[key];
      const tier = mappingConfidence[key];
      if (!col) continue;
      if (tier === "strong") strong += 1;
      else if (tier === "weak") weak += 1;
    }
    const requiredMissing =
      (!identityMapped ? 1 : 0) + (!farmMapped ? 1 : 0);
    return { strong, weak, requiredMissing };
  }, [mapping, mappingConfidence, identityMapped, farmMapped]);

  const setMappingField = useCallback(
    (key: ImportMappingFieldKey, header: string | null) => {
      setSmartMappingNotice(null);
      setMappingConfidence((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setMapping((prev) => ({ ...prev, [key]: header }));
    },
    []
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

  const refreshSavedTemplates = useCallback(() => {
    setSavedTemplates(loadImportMappingTemplates());
  }, []);

  useEffect(() => {
    refreshSavedTemplates();
  }, [refreshSavedTemplates]);

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
    setTemplateNotice(null);
    setTemplateSectionError(null);
    setNewTemplateName("");
    setRenamingTemplateId(null);
    setRenameDraft("");
    setSmartMappingNotice(null);
    setMappingConfidence({});
  }, [clearPreview]);

  /** New file = new dataset → always invalidate preview */
  const handleParseFile = async (file: File) => {
    setImportError(null);
    setTemplateNotice(null);
    setTemplateSectionError(null);
    setSmartMappingNotice(null);
    clearPreview();
    setImportBusy("parse");
    try {
      const lower = file.name.toLowerCase();
      const isXlsx =
        lower.endsWith(".xlsx") ||
        file.type ===
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      const isCsv =
        lower.endsWith(".csv") ||
        file.type === "text/csv" ||
        file.type === "application/csv";

      let data: ImportDataSet;
      let format: "csv" | "xlsx";

      if (isXlsx) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/v1/farm-imports/xlsx/parse", {
          method: "POST",
          body: fd,
        });
        const json = await res.json();
        if (!res.ok || json.error) {
          throw new Error(json.error?.message ?? "Failed to parse Excel file");
        }
        data = json.data as ImportDataSet;
        format = "xlsx";
      } else if (isCsv) {
        const csvText = await file.text();
        const res = await fetch("/api/v1/farm-imports/csv/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ csvText }),
        });
        const json = await res.json();
        if (!res.ok || json.error) {
          throw new Error(json.error?.message ?? "Failed to parse CSV");
        }
        data = json.data as ImportDataSet;
        format = "csv";
      } else {
        setImportError("Please choose a CSV (.csv) or Excel (.xlsx) file.");
        return;
      }

      setDataset(data);
      setFileMeta({ name: file.name, format });
      const {
        mapping: initialMap,
        confidence,
        smartMappedFieldCount,
        strongMappedCount,
        weakMappedCount,
      } = buildImportMappingFromHeaders(data.headers ?? []);
      setMapping(initialMap as ImportMapping);
      setMappingConfidence(
        confidence as Partial<Record<ImportMappingFieldKey, ImportFieldMatchTier>>
      );
      setSmartMappingNotice(
        smartMappedFieldCount > 0
          ? `Linked ${smartMappedFieldCount} column${smartMappedFieldCount === 1 ? "" : "s"}: ${strongMappedCount} high confidence, ${weakMappedCount} suggest review.`
          : null
      );
      setStage("mapping");
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : "Could not read that file. Try CSV or .xlsx."
      );
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
          sourceType: fileMeta?.format === "xlsx" ? "XLSX" : "CSV",
          fileName: fileMeta?.name ?? null,
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
    fileMeta,
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

  const handleApplyTemplate = useCallback(
    (rec: FarmImportMappingTemplateRecord) => {
      setTemplateSectionError(null);
      setSmartMappingNotice(null);
      clearPreview();
      const { mapping: next, unmatchedColumnNames } = applyTemplateMappingToHeaders(
        rec.mapping,
        importHeaders
      );
      setMapping(next as ImportMapping);
      setMappingConfidence({});
      setDefaultTerritoryName(rec.defaultTerritoryName);
      setDefaultAreaName(rec.defaultAreaName);
      if (unmatchedColumnNames.length > 0) {
        setTemplateNotice(
          `No column match for: ${unmatchedColumnNames.join(", ")}. Unmatched mappings were cleared.`
        );
      } else {
        setTemplateNotice(null);
      }
    },
    [importHeaders, clearPreview]
  );

  const handleSaveTemplate = useCallback(() => {
    setTemplateSectionError(null);
    const result = addImportMappingTemplate({
      name: newTemplateName,
      mapping,
      defaultTerritoryName,
      defaultAreaName,
    });
    if (!result.ok) {
      if (result.reason === "empty_name") {
        setTemplateSectionError("Enter a template name.");
      } else {
        setTemplateSectionError("Template limit reached. Delete one to save another.");
      }
      return;
    }
    setNewTemplateName("");
    refreshSavedTemplates();
  }, [newTemplateName, mapping, defaultTerritoryName, defaultAreaName, refreshSavedTemplates]);

  const handleDeleteTemplate = useCallback(
    (id: string) => {
      if (!window.confirm("Delete this saved template?")) return;
      deleteImportMappingTemplateById(id);
      refreshSavedTemplates();
      if (renamingTemplateId === id) {
        setRenamingTemplateId(null);
        setRenameDraft("");
      }
    },
    [refreshSavedTemplates, renamingTemplateId]
  );

  const commitRenameTemplate = useCallback(() => {
    if (!renamingTemplateId) return;
    const res = renameImportMappingTemplate(renamingTemplateId, renameDraft);
    if (!res.ok) {
      setTemplateSectionError(
        res.reason === "empty_name" ? "Enter a name." : "Could not rename template."
      );
      return;
    }
    setRenamingTemplateId(null);
    setRenameDraft("");
    refreshSavedTemplates();
  }, [renamingTemplateId, renameDraft, refreshSavedTemplates]);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-kp-on-surface">Import farm data</h2>
          <p className="mt-1 text-xs text-kp-on-surface-variant">
            Upload a CSV or Excel (.xlsx), map columns, preview results, then import. Up to 1000 rows
            per file.
          </p>
        </div>
        <p className="max-w-[11rem] text-right leading-snug">
          <span className="block text-[11px] font-normal tabular-nums tracking-wide text-kp-on-surface-muted/90">
            {stage === "upload" && "Step 1 of 5"}
            {stage === "mapping" && "Step 2 of 5"}
            {stage === "validation" && "Step 3 of 5"}
            {stage === "executing" && "Step 4 of 5"}
            {stage === "complete" && "Step 5 of 5"}
          </span>
          <span className="mt-1 block text-xs font-semibold text-kp-on-surface">
            {stage === "upload" && "Upload"}
            {stage === "mapping" && "Map columns"}
            {stage === "validation" && "Preview"}
            {stage === "executing" && "Importing"}
            {stage === "complete" && "Done"}
          </span>
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
            <label
              className="text-xs font-medium text-kp-on-surface"
              htmlFor="farm-trackr-import-file-input"
            >
              CSV or Excel (.xlsx)
            </label>
            <div
              className={cn(
                "mt-2 flex h-9 w-full items-center gap-2 rounded-md border border-kp-outline bg-kp-surface-high px-1.5 transition-shadow",
                "focus-within:ring-2 focus-within:ring-kp-teal/50 focus-within:ring-offset-2 focus-within:ring-offset-kp-surface"
              )}
            >
              <input
                id="farm-trackr-import-file-input"
                type="file"
                accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                disabled={importBusy === "parse"}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleParseFile(file);
                  e.target.value = "";
                }}
                className={cn(
                  "min-w-0 flex-1 bg-transparent text-xs text-kp-on-surface-variant",
                  "file:mr-2 file:inline-flex file:h-7 file:shrink-0 file:cursor-pointer file:items-center file:justify-center file:rounded-md file:border-2 file:border-kp-outline file:bg-kp-surface file:px-3 file:py-0 file:text-xs file:font-semibold file:leading-none file:text-kp-on-surface file:shadow-sm",
                  "hover:file:border-kp-teal/70 hover:file:bg-kp-surface-high",
                  "file:focus-visible:outline-none file:focus-visible:ring-2 file:focus-visible:ring-kp-teal/50 file:focus-visible:ring-offset-2 file:focus-visible:ring-offset-kp-surface-high",
                  "disabled:cursor-not-allowed disabled:opacity-50"
                )}
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
                <div className="grid gap-2 rounded-lg border border-kp-outline bg-kp-surface-high p-3 sm:grid-cols-3">
                  <div className="rounded-md border border-teal-500/20 bg-teal-500/[0.07] px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-kp-on-surface-variant">
                      Auto-mapped
                    </p>
                    <p className="mt-0.5 text-xl font-bold tabular-nums text-teal-100">
                      {mappingSummary.strong}
                    </p>
                    <p className="text-[10px] text-kp-on-surface-variant">High-confidence column links</p>
                  </div>
                  <div className="rounded-md border border-amber-500/25 bg-amber-500/[0.08] px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-kp-on-surface-variant">
                      Need review
                    </p>
                    <p className="mt-0.5 text-xl font-bold tabular-nums text-amber-100">
                      {mappingSummary.weak}
                    </p>
                    <p className="text-[10px] text-kp-on-surface-variant">Generic headers — confirm</p>
                  </div>
                  <div className="rounded-md border border-rose-500/25 bg-rose-500/[0.07] px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-kp-on-surface-variant">
                      Required missing
                    </p>
                    <p className="mt-0.5 text-xl font-bold tabular-nums text-rose-100">
                      {mappingSummary.requiredMissing}
                    </p>
                    <p className="text-[10px] text-kp-on-surface-variant">
                      Identity + territory/area gaps
                    </p>
                  </div>
                </div>

                {smartMappingNotice ? (
                  <p className="text-[11px] text-kp-on-surface-variant">
                    <span className="font-medium text-kp-teal/95">{smartMappingNotice}</span>
                  </p>
                ) : null}

                <div className="rounded-lg border border-kp-outline bg-kp-surface-high p-3">
                  <button
                    type="button"
                    onClick={() => setShowTemplatesPanel((v) => !v)}
                    className="flex w-full items-center gap-2 text-left text-xs font-medium text-kp-on-surface-variant hover:text-kp-on-surface"
                  >
                    <Bookmark className="h-3.5 w-3.5 shrink-0 text-kp-teal/90" />
                    {showTemplatesPanel ? (
                      <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span className="text-kp-on-surface">Mapping templates</span>
                    {savedTemplates.length > 0 ? (
                      <span className="ml-auto tabular-nums text-[11px] text-kp-on-surface-muted/90">
                        {savedTemplates.length} saved
                      </span>
                    ) : null}
                  </button>

                  {showTemplatesPanel ? (
                    <div className="mt-3 space-y-2 border-t border-kp-outline pt-3">
                      {templateSectionError ? (
                        <p className="text-[11px] text-amber-200/90">{templateSectionError}</p>
                      ) : null}
                      {templateNotice ? (
                        <div className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-amber-500/25 bg-amber-500/10 px-2.5 py-2 text-[11px] text-amber-100/95">
                          <span className="min-w-0 flex-1 leading-snug">{templateNotice}</span>
                          <button
                            type="button"
                            className="shrink-0 font-medium text-kp-teal underline-offset-2 hover:underline"
                            onClick={() => setTemplateNotice(null)}
                          >
                            Dismiss
                          </button>
                        </div>
                      ) : null}

                      {savedTemplates.length === 0 ? (
                        <p className="text-[11px] text-kp-on-surface-variant">
                          Save a mapping preset to reuse on the next import.
                        </p>
                      ) : (
                        <ul className="space-y-1.5">
                          {savedTemplates.map((t) => (
                            <li
                              key={t.id}
                              className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-kp-outline/80 bg-kp-surface px-2 py-1.5 text-[11px]"
                            >
                              {renamingTemplateId === t.id ? (
                                <>
                                  <Input
                                    value={renameDraft}
                                    onChange={(e) => setRenameDraft(e.target.value)}
                                    className="h-7 min-w-[6rem] flex-1 border-kp-outline bg-kp-surface-high text-xs text-kp-on-surface"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") commitRenameTemplate();
                                      if (e.key === "Escape") {
                                        setRenamingTemplateId(null);
                                        setRenameDraft("");
                                      }
                                    }}
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className={cn(kpBtnSecondary, "h-7 px-2 text-[11px]")}
                                    onClick={() => void commitRenameTemplate()}
                                  >
                                    Save
                                  </Button>
                                  <button
                                    type="button"
                                    className="text-kp-on-surface-variant hover:text-kp-on-surface"
                                    onClick={() => {
                                      setRenamingTemplateId(null);
                                      setRenameDraft("");
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <span className="min-w-0 flex-1 truncate font-medium text-kp-on-surface">
                                    {t.name}
                                  </span>
                                  <button
                                    type="button"
                                    className="shrink-0 font-medium text-kp-teal underline-offset-2 hover:underline"
                                    onClick={() => handleApplyTemplate(t)}
                                  >
                                    Apply
                                  </button>
                                  <button
                                    type="button"
                                    className="inline-flex shrink-0 items-center gap-0.5 text-kp-on-surface-variant hover:text-kp-on-surface"
                                    onClick={() => {
                                      setTemplateSectionError(null);
                                      setRenamingTemplateId(t.id);
                                      setRenameDraft(t.name);
                                    }}
                                    aria-label={`Rename ${t.name}`}
                                  >
                                    <Pencil className="h-3 w-3" />
                                    <span className="hidden sm:inline">Rename</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="inline-flex shrink-0 items-center gap-0.5 text-kp-on-surface-variant hover:text-red-300"
                                    onClick={() => handleDeleteTemplate(t.id)}
                                    aria-label={`Delete ${t.name}`}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                    <span className="hidden sm:inline">Delete</span>
                                  </button>
                                </>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}

                      <div className="flex flex-wrap items-end gap-2 border-t border-kp-outline pt-3">
                        <label className="min-w-[10rem] flex-1 space-y-1">
                          <span className="text-[11px] text-kp-on-surface-variant">
                            Save current mapping
                          </span>
                          <Input
                            value={newTemplateName}
                            onChange={(e) => setNewTemplateName(e.target.value)}
                            placeholder="Template name"
                            className="h-8 border-kp-outline bg-kp-surface text-xs text-kp-on-surface"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveTemplate();
                            }}
                          />
                        </label>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(kpBtnSecondary, "h-8 shrink-0 px-3 text-xs")}
                          onClick={() => handleSaveTemplate()}
                          disabled={!newTemplateName.trim()}
                        >
                          Save template
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>

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

                <div className="space-y-4">
                  {MAPPING_SECTIONS.map((section) => (
                    <div
                      key={section.id}
                      className={cn(
                        "rounded-lg border border-kp-outline bg-kp-surface-high/50 p-4",
                        section.id === "identity" &&
                          !identityMapped &&
                          "ring-2 ring-amber-500/30",
                        section.id === "farm" && !farmMapped && "ring-2 ring-amber-500/30"
                      )}
                    >
                      <h3 className="text-xs font-bold uppercase tracking-wider text-kp-on-surface">
                        {section.title}
                      </h3>
                      {section.description ? (
                        <p className="mt-1.5 text-[11px] leading-relaxed text-kp-on-surface-variant">
                          {section.description}
                        </p>
                      ) : null}
                      {section.fields.length > 0 ? (
                        <div className="mt-4 space-y-3">
                          {section.fields.map((field) => {
                            const pill = mappingRowStatusPill(
                              field.key,
                              mapping,
                              mappingConfidence,
                              defaultTerritoryName,
                              defaultAreaName
                            );
                            const accent = mappingRowAccentClass(
                              field.key,
                              mapping,
                              mappingConfidence,
                              defaultTerritoryName,
                              defaultAreaName
                            );
                            return (
                              <div
                                key={field.key}
                                className={cn(
                                  "rounded-lg border border-kp-outline bg-kp-surface border-l-4 pl-3 pr-3 py-3 shadow-sm",
                                  accent
                                )}
                              >
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-4">
                                  <div className="min-w-0 flex-1 space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-xs font-semibold text-kp-on-surface">
                                        Maps to: {field.label}
                                      </span>
                                      {pill ? (
                                        <span className={pill.className}>{pill.label}</span>
                                      ) : null}
                                    </div>
                                    <p className="text-[10px] text-kp-on-surface-variant">
                                      Choose which column from your file supplies this field.
                                    </p>
                                  </div>
                                  <label className="block w-full shrink-0 lg:max-w-md">
                                    <span className="sr-only">Source column for {field.label}</span>
                                    <select
                                      value={mapping[field.key] ?? ""}
                                      onChange={(e) =>
                                        setMappingField(
                                          field.key,
                                          e.target.value || null
                                        )
                                      }
                                      className="h-10 w-full rounded-md border-2 border-kp-outline bg-kp-surface-high px-3 text-xs font-medium text-kp-on-surface shadow-inner focus:border-kp-teal/60 focus:outline-none focus:ring-2 focus:ring-kp-teal/30"
                                    >
                                      <option value="">— Not mapped —</option>
                                      {importHeaders.map((header) => (
                                        <option
                                          key={`${field.key}-${header}`}
                                          value={header}
                                        >
                                          {header}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>

                <div className="space-y-2 rounded-lg border border-dashed border-kp-outline/80 bg-kp-surface-high/30 p-3">
                  <p className="text-[11px] font-semibold text-kp-on-surface">
                    Default territory &amp; farm area
                  </p>
                  <p className="text-[10px] text-kp-on-surface-variant">
                    Used when the columns above are not mapped. At least one source (column or
                    default) is required for each.
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input
                      value={defaultTerritoryName}
                      onChange={(e) => setDefaultTerritoryName(e.target.value)}
                      placeholder="Default territory name"
                      className="h-10 border-kp-outline bg-kp-surface text-kp-on-surface"
                    />
                    <Input
                      value={defaultAreaName}
                      onChange={(e) => setDefaultAreaName(e.target.value)}
                      placeholder="Default farm area name"
                      className="h-10 border-kp-outline bg-kp-surface text-kp-on-surface"
                    />
                  </div>
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
