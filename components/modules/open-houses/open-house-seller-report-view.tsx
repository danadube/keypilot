"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { pdf } from "@react-pdf/renderer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnPrimary, kpBtnSecondary, kpBtnTertiary } from "@/components/ui/kp-dashboard-button-tiers";
import { SellerReportPDF } from "@/components/reports/SellerReportPDF";
import { PageLoading } from "@/components/shared/PageLoading";
import { ArrowLeft, FileText, Download, RefreshCw, BarChart2, MessageSquare } from "lucide-react";

type ReportData = {
  id: string;
  reportJson: {
    totalVisitors: number;
    representedBuyers: number;
    unrepresentedBuyers: number;
    unknownAgentStatus: number;
    followUpDraftsCreated: number;
    visitorComments: string[];
  };
  createdAt: string;
};

type OpenHouseInfo = {
  title: string;
  property: { address1: string; address2?: string | null; city: string; state: string; zip: string };
};

const formatDate = (d: string) =>
  new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export function OpenHouseSellerReportView({ openHouseId }: { openHouseId: string }) {
  const [report, setReport] = useState<ReportData | null>(null);
  const [openHouse, setOpenHouse] = useState<OpenHouseInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetch(`/api/v1/open-houses/${openHouseId}/report`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) {
          if (json.error.message === "No report found") setReport(null);
          else setError(json.error.message);
        } else {
          setReport(json.data);
        }
      })
      .catch(() => setError("Failed to load report"))
      .finally(() => setLoading(false));
  }, [openHouseId]);

  useEffect(() => {
    if (!report) return;
    fetch(`/api/v1/open-houses/${openHouseId}`)
      .then((res) => res.json())
      .then((json) => { if (json.data) setOpenHouse(json.data); })
      .catch(() => {});
  }, [openHouseId, report]);

  const handleDownloadPDF = async () => {
    if (!report) return;
    setDownloading(true);
    try {
      const blob = await pdf(
        <SellerReportPDF
          data={{
            reportJson: report.reportJson,
            createdAt: report.createdAt,
            propertyAddress: openHouse
              ? [openHouse.property.address1, openHouse.property.address2, openHouse.property.city, openHouse.property.state, openHouse.property.zip]
                  .filter(Boolean)
                  .join(", ")
              : undefined,
            openHouseTitle: openHouse?.title,
          }}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `seller-report-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download PDF");
    } finally {
      setDownloading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/open-houses/${openHouseId}/report`, { method: "POST" });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      setReport(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <PageLoading message="Loading report..." />;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className={cn(kpBtnTertiary, "h-8 gap-1.5 px-2")}
            asChild
          >
            <Link href={`/open-houses/${openHouseId}`}>
              <ArrowLeft className="h-4 w-4" />
              Open house
            </Link>
          </Button>
          <span className="text-kp-outline">/</span>
          <h1 className="text-xl font-bold text-kp-on-surface">Seller report</h1>
        </div>
        {!report && (
          <Button
            variant="outline"
            size="sm"
            className={cn(kpBtnPrimary, "h-8 border-transparent px-3 text-xs")}
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? "Generating…" : "Generate report"}
          </Button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* No report yet */}
      {!report && (
        <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-kp-surface-high text-kp-on-surface-variant">
              <FileText className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-kp-on-surface">No report yet</p>
            <p className="mt-1 max-w-xs text-xs text-kp-on-surface-variant">
              Generate a report to share open house metrics with the seller.
            </p>
            <Button
              variant="outline"
              size="sm"
              className={cn(kpBtnPrimary, "mt-4 h-8 border-transparent px-4 text-xs")}
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? "Generating…" : "Generate report"}
            </Button>
          </div>
        </div>
      )}

      {/* Report data */}
      {report && (
        <>
          <p className="text-xs text-kp-on-surface-variant">
            Generated {formatDate(report.createdAt)}
          </p>

          {/* Metric grid */}
          <div className="rounded-xl border border-kp-outline bg-kp-surface p-5">
            <div className="mb-4 flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-kp-on-surface-variant" />
              <h2 className="text-sm font-semibold text-kp-on-surface">Metrics</h2>
            </div>
            <p className="mb-4 text-xs text-kp-on-surface-variant">Open house performance snapshot</p>

            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {[
                { value: report.reportJson.totalVisitors, label: "Total visitors", color: "text-kp-teal" },
                { value: report.reportJson.representedBuyers, label: "With agent", color: "text-kp-on-surface" },
                { value: report.reportJson.unrepresentedBuyers, label: "Without agent", color: "text-kp-on-surface" },
                { value: report.reportJson.unknownAgentStatus, label: "Unknown", color: "text-kp-on-surface-variant" },
                { value: report.reportJson.followUpDraftsCreated, label: "Follow-up drafts", color: "text-kp-gold" },
              ].map(({ value, label, color }) => (
                <div key={label} className="rounded-lg border border-kp-outline bg-kp-surface-high p-3">
                  <p className={`text-2xl font-semibold ${color}`}>{value}</p>
                  <p className="text-xs text-kp-on-surface-variant">{label}</p>
                </div>
              ))}
            </div>

            {/* Visitor comments */}
            {report.reportJson.visitorComments.length > 0 && (
              <div className="mt-5">
                <div className="mb-2 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-kp-on-surface-variant" />
                  <h3 className="text-sm font-medium text-kp-on-surface">Visitor comments</h3>
                </div>
                <ul className="space-y-2 rounded-lg border border-kp-outline bg-kp-surface-high p-4">
                  {report.reportJson.visitorComments.map((c, i) => (
                    <li key={i} className="text-sm text-kp-on-surface">
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="mt-5 flex flex-wrap gap-2 border-t border-kp-outline pt-4">
              <Button
                variant="outline"
                size="sm"
                className={cn(kpBtnPrimary, "h-8 border-transparent px-3 text-xs")}
                onClick={handleDownloadPDF}
                disabled={downloading}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                {downloading ? "Generating PDF…" : "Download PDF"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={cn(kpBtnSecondary, "h-8 text-xs")}
                onClick={handleGenerate}
                disabled={generating}
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Regenerate report
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
