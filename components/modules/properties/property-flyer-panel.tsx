"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Upload, Trash2, ExternalLink } from "lucide-react";

export type PropertyFlyerFields = {
  flyerUrl?: string | null;
  flyerFilename?: string | null;
  flyerUploadedAt?: string | null;
  flyerEnabled?: boolean | null;
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type PropertyFlyerPanelProps = {
  propertyId: string;
  flyer: PropertyFlyerFields;
  onFlyerPatch: (patch: Partial<PropertyFlyerFields>) => void;
};

/**
 * Property listing PDF flyer — visitor email attachment. Uses POST/DELETE /api/v1/properties/[id]/flyer.
 */
export function PropertyFlyerPanel({ propertyId, flyer, onFlyerPatch }: PropertyFlyerPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [flyerError, setFlyerError] = useState<string | null>(null);

  const handleFlyerUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";
      setFlyerError(null);
      setBusy(true);
      const formData = new FormData();
      formData.set("file", file);
      fetch(`/api/v1/properties/${propertyId}/flyer`, { method: "POST", body: formData })
        .then((res) => res.json())
        .then((json) => {
          if (json.error) throw new Error(json.error.message);
          onFlyerPatch({
            flyerUrl: json.data.flyerUrl,
            flyerFilename: json.data.flyerFilename,
            flyerUploadedAt: json.data.flyerUploadedAt,
            flyerEnabled: true,
          });
        })
        .catch((err) => setFlyerError(err instanceof Error ? err.message : "Upload failed"))
        .finally(() => setBusy(false));
    },
    [propertyId, onFlyerPatch]
  );

  const handleRemoveFlyer = useCallback(() => {
    if (!confirm("Remove this flyer? It will no longer be sent to visitors.")) return;
    setFlyerError(null);
    setBusy(true);
    fetch(`/api/v1/properties/${propertyId}/flyer`, { method: "DELETE" })
      .then((res) => res.json())
      .then((json) => {
        if (json.error) throw new Error(json.error.message);
        onFlyerPatch({
          flyerUrl: null,
          flyerFilename: null,
          flyerUploadedAt: null,
          flyerEnabled: true,
        });
      })
      .catch((err) => setFlyerError(err instanceof Error ? err.message : "Remove failed"))
      .finally(() => setBusy(false));
  }, [propertyId, onFlyerPatch]);

  const hasFlyer = !!(flyer.flyerUrl?.trim() && flyer.flyerEnabled !== false);

  return (
    <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
      <div className="mb-3 flex items-center gap-2">
        <FileText className="h-4 w-4 text-kp-on-surface-variant" />
        <h2 className="text-sm font-semibold text-kp-on-surface">Property flyer</h2>
      </div>
      <p className="mb-4 text-xs text-kp-on-surface-variant">
        PDF flyer sent to visitors after open house sign-in. Created in Canva or elsewhere.
      </p>

      {flyerError && <p className="mb-3 text-sm text-red-400">{flyerError}</p>}

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFlyerUpload}
      />

      {hasFlyer ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-kp-outline bg-kp-surface-high px-3 py-2 text-sm">
            <FileText className="h-4 w-4 shrink-0 text-kp-on-surface-variant" />
            <span className="font-medium text-kp-on-surface">
              {flyer.flyerFilename ?? "Flyer"}
            </span>
            {flyer.flyerUploadedAt && (
              <span className="text-xs text-kp-on-surface-variant">
                · {formatDate(flyer.flyerUploadedAt)}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-kp-outline bg-transparent text-xs text-kp-on-surface hover:bg-kp-surface-high"
              asChild
            >
              <a href={flyer.flyerUrl!} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Preview
              </a>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-kp-outline bg-transparent text-xs text-kp-on-surface hover:bg-kp-surface-high"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              {busy ? "Uploading…" : "Replace"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-400"
              disabled={busy}
              onClick={handleRemoveFlyer}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="h-8 border-kp-outline bg-transparent text-xs text-kp-on-surface hover:bg-kp-surface-high"
          disabled={busy}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mr-1.5 h-3.5 w-3.5" />
          {busy ? "Uploading…" : "Upload flyer (PDF)"}
        </Button>
      )}
    </div>
  );
}
