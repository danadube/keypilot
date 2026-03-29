"use client";

import { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";

/**
 * POSTs a PDF to `/api/v1/open-houses/[id]/flyer` — immediate file picker, no navigation.
 */
export function OpenHouseFlyerUploadButton({
  openHouseId,
  onUploaded,
  onError,
  className,
  size = "default",
}: {
  openHouseId: string;
  onUploaded: () => void;
  onError: (message: string | null) => void;
  className?: string;
  size?: "default" | "sm";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    onError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/v1/open-houses/${openHouseId}/flyer`, {
        method: "POST",
        body: fd,
      });
      const json = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!res.ok || json.error) {
        throw new Error(json.error?.message ?? "Upload failed");
      }
      onUploaded();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  const sm = size === "sm";

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        aria-hidden
        onChange={(e) => void onChange(e)}
      />
      <Button
        type="button"
        variant="outline"
        size={sm ? "sm" : "default"}
        disabled={busy}
        className={cn(kpBtnSecondary, sm && "h-8 text-xs", className)}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? (
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
        ) : (
          <Upload className="mr-1.5 h-3.5 w-3.5" />
        )}
        {busy ? "Uploading…" : "Upload flyer"}
      </Button>
    </>
  );
}
