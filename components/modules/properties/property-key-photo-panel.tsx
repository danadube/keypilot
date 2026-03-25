"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ImagePlus, Upload, Trash2 } from "lucide-react";

type PropertyKeyPhotoPanelProps = {
  propertyId: string;
  imageUrl: string | null | undefined;
  onImagePatch: (imageUrl: string | null) => void;
};

/**
 * Single key listing photo (Property.imageUrl). POST /api/v1/properties/[id]/photo, clear via PUT with imageUrl null.
 */
export function PropertyKeyPhotoPanel({ propertyId, imageUrl, onImagePatch }: PropertyKeyPhotoPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasImage = !!imageUrl?.trim();

  const handleUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";
      setError(null);
      setBusy(true);
      const formData = new FormData();
      formData.set("file", file);
      fetch(`/api/v1/properties/${propertyId}/photo`, { method: "POST", body: formData })
        .then((res) => res.json())
        .then((json) => {
          if (json.error) throw new Error(json.error.message);
          onImagePatch(json.data.imageUrl);
        })
        .catch((err) => setError(err instanceof Error ? err.message : "Photo upload failed"))
        .finally(() => setBusy(false));
    },
    [propertyId, onImagePatch]
  );

  const handleRemove = useCallback(() => {
    if (
      !confirm(
        "Remove this key photo? It will no longer appear here or on visitor sign-in pages."
      )
    )
      return;
    setError(null);
    setBusy(true);
    fetch(`/api/v1/properties/${propertyId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl: null }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.error) throw new Error(json.error.message);
        onImagePatch(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not remove photo"))
      .finally(() => setBusy(false));
  }, [propertyId, onImagePatch]);

  return (
    <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-kp-on-surface">Key listing photo</h2>
        <p className="mt-1 text-xs text-kp-on-surface-variant">
          One image for this property — shown on the overview and open house sign-in.
        </p>
      </div>

      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleUpload}
      />

      {hasImage ? (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-lg border border-kp-outline bg-kp-surface-high">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl!}
              alt="Property listing"
              className="mx-auto max-h-[min(420px,55vh)] w-full object-contain"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-kp-outline bg-transparent text-xs text-kp-on-surface hover:bg-kp-surface-high"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              {busy ? "Uploading…" : "Replace image"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-400"
              disabled={busy}
              onClick={handleRemove}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-kp-outline bg-kp-surface-high/50 px-4 py-10">
          <p className="text-center text-sm text-kp-on-surface-variant">
            No photo yet. Upload a JPEG, PNG, or WebP (max 5 MB).
          </p>
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-kp-outline bg-kp-surface text-xs text-kp-on-surface hover:bg-kp-surface-high"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlus className="mr-1.5 h-3.5 w-3.5" />
            {busy ? "Uploading…" : "Upload photo"}
          </Button>
        </div>
      )}
    </div>
  );
}
