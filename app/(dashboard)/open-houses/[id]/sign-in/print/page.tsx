"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnPrimary, kpBtnTertiary } from "@/components/ui/kp-dashboard-button-tiers";
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { ChevronLeft, Printer } from "lucide-react";

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

  if (loading) return <PageLoading message="Loading..." />;
  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <ErrorMessage
          message={error ?? "Not found"}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  const address = [
    data.property.address1,
    data.property.address2,
    [data.property.city, data.property.state, data.property.zip].filter(Boolean).join(", "),
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8 px-4">
        <div className="no-print flex flex-wrap items-center justify-between gap-4">
          <Button variant="ghost" size="sm" className={cn(kpBtnTertiary)} asChild>
            <Link href={`/open-houses/${id}/sign-in`} className="inline-flex items-center gap-1.5">
              <ChevronLeft className="h-4 w-4" />
              Back to host sign-in
            </Link>
          </Button>
          <Button
            variant="outline"
            onClick={handlePrint}
            className={cn(kpBtnPrimary, "border-transparent inline-flex items-center gap-2")}
          >
            <Printer className="h-4 w-4" />
            Print QR poster
          </Button>
        </div>

        <div className="print-qr-poster flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-8 md:p-12 text-center">
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
    </div>
  );
}
