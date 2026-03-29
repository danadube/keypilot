"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnTertiary } from "@/components/ui/kp-dashboard-button-tiers";
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { Users } from "lucide-react";
import { OpenHouseSupportPageFrame } from "@/components/showing-hq/OpenHouseSupportPageFrame";
import { useOpenHouseContextSubtitle } from "@/components/showing-hq/useOpenHouseContextSubtitle";

type Visitor = {
  id: string;
  signInMethod: string;
  submittedAt: string;
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
  };
};

const formatDate = (d: string) =>
  new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export function OpenHouseVisitorsView({ openHouseId }: { openHouseId: string }) {
  const subtitle = useOpenHouseContextSubtitle(openHouseId);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(() => {
    setError(null);
    setLoading(true);
    fetch(`/api/v1/open-houses/${openHouseId}/visitors`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error.message);
        else setVisitors(json.data || []);
      })
      .catch(() => setError("Failed to load visitors"))
      .finally(() => setLoading(false));
  }, [openHouseId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <OpenHouseSupportPageFrame
        openHouseId={openHouseId}
        contextSubtitle={subtitle}
      >
        <PageLoading message="Loading visitors..." />
      </OpenHouseSupportPageFrame>
    );
  }
  if (error) {
    return (
      <OpenHouseSupportPageFrame
        openHouseId={openHouseId}
        contextSubtitle={subtitle}
      >
        <ErrorMessage message={error} onRetry={loadData} />
      </OpenHouseSupportPageFrame>
    );
  }

  return (
    <OpenHouseSupportPageFrame
      openHouseId={openHouseId}
      contextSubtitle={subtitle}
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold text-kp-on-surface">Visitor list</h1>
          <span className="rounded-full bg-kp-surface-high px-2.5 py-0.5 text-xs font-medium text-kp-on-surface-variant">
            {visitors.length}
          </span>
        </div>

        <div className="rounded-xl border border-kp-outline bg-kp-bg/80 p-5">
          <div className="mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-kp-on-surface-variant" />
            <h2 className="text-sm font-semibold text-kp-on-surface">Sign-in list</h2>
          </div>
          <p className="mb-4 text-xs text-kp-on-surface-variant">
            Visitors who signed in at this event
          </p>

          {visitors.length === 0 ? (
            <div className="py-10 text-center">
              <Users className="mx-auto mb-2 h-8 w-8 text-kp-on-surface-variant opacity-40" />
              <p className="text-sm text-kp-on-surface-variant">
                No visitors yet. Share the QR link for sign-ins.
              </p>
            </div>
          ) : (
            <div className="-mx-1 overflow-x-auto px-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-kp-outline">
                    {["Name", "Email", "Phone", "Sign-in", "Time", ""].map((h) => (
                      <th
                        key={h}
                        className={`pb-2.5 pt-0.5 text-xs font-semibold uppercase tracking-wider text-kp-on-surface-variant ${h === "" ? "w-[80px] text-right" : "text-left"}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-kp-outline">
                  {visitors.map((v) => (
                    <tr key={v.id} className="transition-colors hover:bg-kp-surface-high">
                      <td className="py-2.5 font-medium text-kp-on-surface">
                        {v.contact.firstName} {v.contact.lastName}
                      </td>
                      <td className="py-2.5 text-kp-on-surface-variant">{v.contact.email || "—"}</td>
                      <td className="py-2.5 text-kp-on-surface-variant">{v.contact.phone || "—"}</td>
                      <td className="py-2.5 text-kp-on-surface-variant">{v.signInMethod}</td>
                      <td className="whitespace-nowrap py-2.5 text-kp-on-surface-variant">
                        {formatDate(v.submittedAt)}
                      </td>
                      <td className="py-2.5 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(kpBtnTertiary, "h-7 text-xs")}
                          asChild
                        >
                          <Link href={`/contacts/${v.contact.id}`}>View</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </OpenHouseSupportPageFrame>
  );
}
