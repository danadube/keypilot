"use client";

import * as React from "react";
import useSWR from "swr";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionTabs } from "@/components/ui/section-tabs";
import { cn } from "@/lib/utils";

export type DailyBriefingPreviewBundle = {
  meta: { source: string; subject: string };
  data: { subject: string; html: string; text: string };
};

async function fetchPreviewJson(url: string): Promise<DailyBriefingPreviewBundle> {
  const res = await fetch(url, { credentials: "include" });
  const json = (await res.json().catch(() => ({}))) as DailyBriefingPreviewBundle & {
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new Error(
      typeof json?.error?.message === "string" ? json.error.message : `Request failed (${res.status})`
    );
  }
  if (
    !json.data ||
    typeof json.data.html !== "string" ||
    typeof json.data.text !== "string"
  ) {
    throw new Error("Invalid preview response");
  }
  return json as DailyBriefingPreviewBundle;
}

export function DailyBriefingPreviewView() {
  const [source, setSource] = React.useState<"sample" | "live">("sample");
  const [format, setFormat] = React.useState<"html" | "text">("html");

  const key = `/api/v1/daily-briefing/email-preview?source=${source}&format=json`;
  const { data, error, isLoading } = useSWR(key, fetchPreviewJson, {
    revalidateOnFocus: false,
    errorRetryCount: 1,
  });

  const subject = data?.data?.subject ?? data?.meta?.subject ?? "";

  return (
    <div className="min-w-0 pb-10">
      <PageHeader
        title="Daily briefing preview"
        subtitle="Same HTML and plain text as the delivery layer — for product review, QA, and copy checks. Nothing is sent."
      />

      <div className="mt-2 flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:gap-8">
          <fieldset className="min-w-0 space-y-1.5">
            <legend className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
              Source
            </legend>
            <SectionTabs
              tabs={[
                { label: "Sample", value: "sample" },
                { label: "Live", value: "live" },
              ]}
              active={source}
              onChange={(v) => setSource(v as "sample" | "live")}
            />
          </fieldset>
          <fieldset className="min-w-0 space-y-1.5">
            <legend className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
              Format
            </legend>
            <SectionTabs
              tabs={[
                { label: "HTML", value: "html" },
                { label: "Text", value: "text" },
              ]}
              active={format}
              onChange={(v) => setFormat(v as "html" | "text")}
            />
          </fieldset>
        </div>

        <div className="rounded-lg border border-kp-outline/80 bg-kp-surface-high/20 px-4 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-kp-on-surface-muted">
            Subject line
          </div>
          <p className="mt-1 font-mono text-sm text-kp-on-surface">
            {isLoading ? (
              <span className="inline-block h-4 w-64 animate-pulse rounded bg-kp-surface-high/50" />
            ) : error ? (
              <span className="text-kp-on-surface-variant">—</span>
            ) : (
              subject
            )}
          </p>
        </div>

        {error ? (
          <div
            role="alert"
            className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          >
            {error instanceof Error ? error.message : "Could not load preview."}
          </div>
        ) : null}

        <div className="min-h-[50vh]">
          {isLoading ? (
            <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-kp-outline/60 bg-kp-surface/40">
              <span className="text-sm text-kp-on-surface-muted">Loading preview…</span>
            </div>
          ) : data && !error ? (
            format === "html" ? (
              <div className="overflow-hidden rounded-lg border border-kp-outline/80 bg-[#0B1120] shadow-lg ring-1 ring-black/20">
                <div className="border-b border-kp-outline/50 px-3 py-2 text-center text-[11px] uppercase tracking-wider text-kp-on-surface-muted">
                  Email body (rendered output)
                </div>
                <div className="flex justify-center overflow-auto p-4 md:p-6">
                  <iframe
                    title="Daily briefing email HTML preview"
                    className="h-[min(80vh,900px)] w-full max-w-[640px] rounded border-0 bg-[#0B1120] shadow-md"
                    srcDoc={data.data.html}
                  />
                </div>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-kp-outline/80 bg-kp-surface-high/15 shadow-lg ring-1 ring-black/10">
                <div className="border-b border-kp-outline/50 px-3 py-2 text-center text-[11px] uppercase tracking-wider text-kp-on-surface-muted">
                  Plain text (multipart fallback)
                </div>
                <pre
                  className={cn(
                    "max-h-[min(80vh,900px)] overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-[13px] leading-relaxed",
                    "text-kp-on-surface"
                  )}
                >
                  {data.data.text}
                </pre>
              </div>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}
