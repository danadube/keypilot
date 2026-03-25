"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnSecondary, kpBtnTertiary } from "@/components/ui/kp-dashboard-button-tiers";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LeadStatusBadge } from "@/components/shared/LeadStatusBadge";
import { InterestBadge } from "@/components/shared/InterestBadge";
import { Users, Search, QrCode, Calendar, Mail } from "lucide-react";

type Visitor = {
  id: string;
  leadStatus: string | null;
  interestLevel: string | null;
  signInMethod: string;
  submittedAt: string;
  flyerEmailSentAt: string | null;
  flyerLinkClickedAt: string | null;
  flyerEmailStatus: string | null;
  followUpStatus: string | null;
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    notes: string | null;
  };
  openHouse: {
    id: string;
    title: string;
    startAt: string;
    property: { address1: string; city?: string; state?: string };
  };
};

type OpenHouse = {
  id: string;
  title: string;
  startAt: string;
  property: { address1: string; city?: string; state?: string };
};

export function VisitorsListView() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [openHouses, setOpenHouses] = useState<OpenHouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterOpenHouseId, setFilterOpenHouseId] = useState<string>("all");
  const [searchDebounce, setSearchDebounce] = useState("");
  const [sort, setSort] = useState<string>("date-desc");

  const loadData = useCallback(() => {
    setError(null);
    setLoading(true);
    const params = new URLSearchParams();
    if (searchDebounce) params.set("q", searchDebounce);
    if (filterOpenHouseId && filterOpenHouseId !== "all")
      params.set("openHouseId", filterOpenHouseId);
    params.set("sort", sort);
    fetch(`/api/v1/showing-hq/visitors?${params}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error.message);
        else {
          setVisitors(json.data?.visitors ?? []);
          setOpenHouses(json.data?.openHouses ?? []);
        }
      })
      .catch(() => setError("Failed to load visitors"))
      .finally(() => setLoading(false));
  }, [searchDebounce, filterOpenHouseId, sort]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounce(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const formatDateTime = (d: string) =>
    new Date(d).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  const formatAddress = (p: { address1: string; city?: string; state?: string }) =>
    [p.address1, p.city, p.state].filter(Boolean).join(", ") || p.address1;

  const fullName = (c: Visitor["contact"]) =>
    [c.firstName, c.lastName].filter(Boolean).join(" ") || "Unknown";

  if (error) return <ErrorMessage message={error} onRetry={loadData} />;

  return (
    <div className="flex flex-col gap-6">
      {/* Summary strip + filters */}
      <div className="rounded-xl border border-kp-outline bg-kp-surface p-4">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-kp-surface-high">
              <Users className="h-5 w-5 text-kp-on-surface-variant" />
            </div>
            <div>
              <p className="text-xs font-medium text-kp-on-surface-variant">Showing</p>
              <p className="text-xl font-semibold text-kp-on-surface">
                {loading ? "…" : visitors.length} visitor{visitors.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-kp-on-surface-variant" />
              <Input
                placeholder="Search name, email, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 border-kp-outline bg-kp-surface-high pl-9 text-kp-on-surface placeholder:text-kp-on-surface-variant focus:ring-kp-teal"
              />
            </div>
            <Select value={filterOpenHouseId} onValueChange={setFilterOpenHouseId}>
              <SelectTrigger className="h-9 w-[200px] border-kp-outline bg-kp-surface-high text-kp-on-surface">
                <SelectValue placeholder="All events" />
              </SelectTrigger>
              <SelectContent className="border-kp-outline bg-kp-surface text-kp-on-surface">
                <SelectItem value="all">All open houses</SelectItem>
                {openHouses.map((oh) => (
                  <SelectItem key={oh.id} value={oh.id}>
                    {oh.title} · {formatAddress(oh.property)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="h-9 w-[140px] border-kp-outline bg-kp-surface-high text-kp-on-surface">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent className="border-kp-outline bg-kp-surface text-kp-on-surface">
                <SelectItem value="date-desc">Newest first</SelectItem>
                <SelectItem value="date-asc">Oldest first</SelectItem>
                <SelectItem value="name-asc">Name A–Z</SelectItem>
                <SelectItem value="name-desc">Name Z–A</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* Main visitors table */}
        <div className="min-w-0 rounded-xl border border-kp-outline bg-kp-surface p-5">
          {loading ? (
            <PageLoading message="Loading visitors..." />
          ) : visitors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-kp-surface-high text-kp-on-surface-variant">
                <Users className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-kp-on-surface">No visitors yet</p>
              <p className="mt-1 max-w-xs text-xs text-kp-on-surface-variant">
                Share your sign-in link or QR code at your next open house. Visitors will appear here as they sign in.
              </p>
              <Button
                variant="outline"
                size="sm"
                className={cn(kpBtnSecondary, "mt-3 text-xs")}
                asChild
              >
                <Link href="/open-houses/sign-in">Set up sign-in page</Link>
              </Button>
            </div>
          ) : (
            <div className="-mx-1 overflow-x-auto px-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-kp-outline">
                    {["Name","Email","Phone","Interest","Open House","Property","Sign-in","Lead status","Conversion","Notes",""].map((h) => (
                      <th key={h} className={`pb-2.5 pt-0.5 text-xs font-semibold uppercase tracking-wider text-kp-on-surface-variant ${h === "" ? "w-[1%] whitespace-nowrap text-right" : "text-left"}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-kp-outline">
                  {visitors.map((v) => (
                    <tr key={v.id} className="transition-colors hover:bg-kp-surface-high">
                      <td className="py-2.5 font-medium text-kp-on-surface">{fullName(v.contact)}</td>
                      <td className="py-2.5 text-kp-on-surface-variant">{v.contact.email ?? "—"}</td>
                      <td className="py-2.5 text-kp-on-surface-variant">{v.contact.phone ?? "—"}</td>
                      <td className="py-2.5"><InterestBadge interestLevel={v.interestLevel} /></td>
                      <td className="py-2.5 text-kp-on-surface-variant">{v.openHouse.title}</td>
                      <td className="max-w-[140px] truncate py-2.5 text-kp-on-surface-variant" title={formatAddress(v.openHouse.property)}>
                        {formatAddress(v.openHouse.property)}
                      </td>
                      <td className="whitespace-nowrap py-2.5 text-kp-on-surface-variant">{formatDateTime(v.submittedAt)}</td>
                      <td className="py-2.5"><LeadStatusBadge status={v.leadStatus} /></td>
                      <td className="py-2.5">
                        <span className="flex flex-wrap gap-1.5 text-xs text-kp-on-surface-variant">
                          {v.flyerEmailSentAt && <span>Flyer sent ✓</span>}
                          {v.flyerLinkClickedAt && <span>Flyer opened ✓</span>}
                          {v.followUpStatus === "DRAFT" && <span>Draft ready</span>}
                          {v.followUpStatus === "REVIEWED" && <span>Reviewed</span>}
                          {v.followUpStatus === "SENT_MANUAL" && <span>Sent</span>}
                          {!v.flyerEmailSentAt && !v.flyerLinkClickedAt && !v.followUpStatus ? "—" : null}
                        </span>
                      </td>
                      <td className="max-w-[160px] py-2.5">
                        <span
                          className="block truncate text-kp-on-surface-variant"
                          title={v.contact.notes ?? undefined}
                        >
                          {v.contact.notes
                            ? v.contact.notes.length > 60
                              ? `${v.contact.notes.slice(0, 60)}…`
                              : v.contact.notes
                            : "—"}
                        </span>
                      </td>
                      <td className="py-2.5 text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className={cn(kpBtnSecondary, "h-7 text-xs")}
                            asChild
                          >
                            <Link href={`/showing-hq/visitors/${v.id}`}>View</Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn(kpBtnTertiary, "h-7 text-xs")}
                            asChild
                          >
                            <Link href={`/contacts/${v.contact.id}`}>Contact</Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right-side quick actions */}
        <div className="space-y-4 lg:sticky lg:top-6">
          <div className="rounded-xl border border-kp-outline bg-kp-surface p-4">
            <h3 className="mb-3 text-sm font-semibold text-kp-on-surface">Quick actions</h3>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className={cn(kpBtnSecondary, "w-full justify-start")}
                asChild
              >
                <Link href="/open-houses/sign-in">
                  <QrCode className="mr-2 h-4 w-4" />
                  Set up sign-in page
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={cn(kpBtnSecondary, "w-full justify-start")}
                asChild
              >
                <Link href="/open-houses">
                  <Calendar className="mr-2 h-4 w-4" />
                  Open houses
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={cn(kpBtnSecondary, "w-full justify-start")}
                asChild
              >
                <Link href="/showing-hq/follow-ups">
                  <Mail className="mr-2 h-4 w-4" />
                  Follow-ups
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
