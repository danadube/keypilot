"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { pdf } from "@react-pdf/renderer";
import { Button } from "@/components/ui/button";
import { SellerReportPDF } from "@/components/reports/SellerReportPDF";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageLoading } from "@/components/shared/PageLoading";

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

export function SellerReport({ openHouseId }: { openHouseId: string }) {
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
          if (json.error.message === "No report found") {
            setReport(null);
          } else {
            setError(json.error.message);
          }
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
      .then((json) => {
        if (json.data) setOpenHouse(json.data);
      })
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
      const res = await fetch(
        `/api/v1/open-houses/${openHouseId}/report`,
        { method: "POST" }
      );
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

  const formatDate = (d: string) =>
    new Date(d).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/open-houses/${openHouseId}`}>← Back</Link>
          </Button>
          <h1 className="text-2xl font-semibold">Seller report</h1>
        </div>
        {!report && (
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? "Generating..." : "Generate report"}
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {report ? (
        <div className="space-y-6">
          <p className="text-muted-foreground text-sm">
            Generated {formatDate(report.createdAt)}
          </p>
          <Card>
            <CardHeader>
              <CardTitle>Metrics</CardTitle>
              <CardDescription>Open house performance snapshot</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Total visitors</p>
                  <p className="text-2xl font-semibold">
                    {report.reportJson.totalVisitors}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">With agent</p>
                  <p className="text-2xl font-semibold">
                    {report.reportJson.representedBuyers}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Without agent</p>
                  <p className="text-2xl font-semibold">
                    {report.reportJson.unrepresentedBuyers}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Unknown</p>
                  <p className="text-2xl font-semibold">
                    {report.reportJson.unknownAgentStatus}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Follow-up drafts</p>
                  <p className="text-2xl font-semibold">
                    {report.reportJson.followUpDraftsCreated}
                  </p>
                </div>
              </div>
              {report.reportJson.visitorComments.length > 0 && (
                <div>
                  <h3 className="mb-2 font-medium">Visitor comments</h3>
                  <ul className="space-y-2 rounded-lg border p-4">
                    {report.reportJson.visitorComments.map((c, i) => (
                      <li key={i} className="text-sm">
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="default"
                  onClick={handleDownloadPDF}
                  disabled={downloading}
                >
                  {downloading ? "Generating PDF..." : "Download PDF"}
                </Button>
                <Button variant="outline" onClick={handleGenerate} disabled={generating}>
                  Regenerate report
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No report yet</CardTitle>
            <CardDescription>
              Generate a report to share metrics with the seller
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? "Generating..." : "Generate report"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
