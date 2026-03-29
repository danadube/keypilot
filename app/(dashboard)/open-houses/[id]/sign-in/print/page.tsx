"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnPrimary } from "@/components/ui/kp-dashboard-button-tiers";
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { Printer } from "lucide-react";
import { OpenHouseSupportPageFrame } from "@/components/showing-hq/OpenHouseSupportPageFrame";

type PrintData = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  qrSlug: string;
  qrCodeDataUrl: string;
  property: {
    address1: string;
    address2?: string | null;
    city: string;
    state: string;
    zip: string;
  };
};

export default function PrintQRPosterPage() {
  const params = useParams();
  const id = params?.id as string;
  const [data, setData] = useState<PrintData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/v1/open-houses/${id}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error.message);
        else setData(json.data);
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, [id]);

  const handlePrint = () => window.print();

  if (!id) {
    return (
      <div className="py-8">
        <ErrorMessage message="Missing event" onRetry={() => window.location.reload()} />
      </div>
    );
  }

  if (loading) {
    return (
      <OpenHouseSupportPageFrame openHouseId={id}>
        <div className="flex justify-center py-16">
          <PageLoading message="Loading…" />
        </div>
      </OpenHouseSupportPageFrame>
    );
  }

  if (error || !data) {
    return (
      <OpenHouseSupportPageFrame openHouseId={id}>
        <div className="py-8">
          <ErrorMessage
            message={error ?? "Not found"}
            onRetry={() => window.location.reload()}
          />
        </div>
      </OpenHouseSupportPageFrame>
    );
  }

  const address = [
    data.property.address1,
    data.property.address2,
    [data.property.city, data.property.state, data.property.zip].filter(Boolean).join(", "),
  ]
    .filter(Boolean)
    .join(", ");

  const contextSubtitle = [data.property.address1, data.property.city]
    .filter(Boolean)
    .join(", ");

  return (
    <OpenHouseSupportPageFrame
      openHouseId={id}
      contextSubtitle={contextSubtitle}
      maxWidthClass="max-w-3xl"
      headerRight={
        <Button
          variant="outline"
          onClick={handlePrint}
          className={cn(
            kpBtnPrimary,
            "inline-flex items-center gap-2 border-transparent"
          )}
        >
          <Printer className="h-4 w-4" />
          Print QR poster
        </Button>
      }
    >
      <p className="no-print mb-4 text-sm text-kp-on-surface-variant">
        <Link
          href={`/open-houses/${id}/sign-in`}
          className="font-medium text-kp-on-surface hover:underline"
        >
          Open host sign-in (tablet)
        </Link>
      </p>

      <div className="print-qr-poster flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-8 text-center md:p-12">
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
          Scan to sign in
        </h1>
        <p className="mt-2 text-lg text-slate-600">
          {address}
        </p>
        {data.qrCodeDataUrl && (
          <div className="mt-8 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={data.qrCodeDataUrl}
              alt="Scan to sign in at open house"
              width={280}
              height={280}
              className="rounded-lg border-2 border-slate-200 bg-white p-2"
            />
          </div>
        )}
        <p className="mt-6 text-base font-medium text-slate-700">
          Open house · {data.title}
        </p>
      </div>
    </OpenHouseSupportPageFrame>
  );
}
