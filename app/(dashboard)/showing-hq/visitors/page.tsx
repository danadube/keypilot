"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { BrandPageHeader } from "@/components/ui/BrandPageHeader";
import { BrandCard } from "@/components/ui/BrandCard";
import { BrandButton } from "@/components/ui/BrandButton";
import { BrandEmptyState } from "@/components/ui/BrandEmptyState";
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LeadStatusBadge } from "@/components/shared/LeadStatusBadge";
import { Users, Search } from "lucide-react";

type Visitor = {
  id: string;
  leadStatus: string | null;
  signInMethod: string;
  submittedAt: string;
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

export default function ShowingHQVisitorsPage() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [openHouses, setOpenHouses] = useState<OpenHouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterOpenHouseId, setFilterOpenHouseId] = useState<string>("all");
  const [searchDebounce, setSearchDebounce] = useState("");

  const loadData = useCallback(() => {
    setError(null);
    setLoading(true);
    const params = new URLSearchParams();
    if (searchDebounce) params.set("q", searchDebounce);
    if (filterOpenHouseId && filterOpenHouseId !== "all")
      params.set("openHouseId", filterOpenHouseId);
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
  }, [searchDebounce, filterOpenHouseId]);

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
    <div className="flex flex-col gap-[var(--space-xl)]">
      <BrandPageHeader
        title="Visitors"
        description="Review open house visitors, search leads, and connect sign-ins to contacts."
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--brand-text-muted)]" />
          <Input
            placeholder="Search by name, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={filterOpenHouseId}
          onValueChange={setFilterOpenHouseId}
        >
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="All open houses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All open houses</SelectItem>
            {openHouses.map((oh) => (
              <SelectItem key={oh.id} value={oh.id}>
                {oh.title} · {formatAddress(oh.property)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <BrandCard elevated padded>
        {loading ? (
          <PageLoading message="Loading visitors..." />
        ) : visitors.length === 0 ? (
          <BrandEmptyState
            icon={<Users className="h-8 w-8 text-[var(--brand-text-muted)]" />}
            title="No visitors yet"
            description="Visitors will appear here once they sign in at your open houses. Share your sign-in link at your next event."
            action={
              <BrandButton variant="secondary" asChild>
                <Link href="/open-houses/sign-in">Open sign-in</Link>
              </BrandButton>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--brand-border)]">
                  <th className="pb-3 text-left font-semibold text-[var(--brand-text)]">
                    Name
                  </th>
                  <th className="pb-3 text-left font-semibold text-[var(--brand-text)]">
                    Email
                  </th>
                  <th className="pb-3 text-left font-semibold text-[var(--brand-text)]">
                    Phone
                  </th>
                  <th className="pb-3 text-left font-semibold text-[var(--brand-text)]">
                    Open House
                  </th>
                  <th className="pb-3 text-left font-semibold text-[var(--brand-text)]">
                    Property
                  </th>
                  <th className="pb-3 text-left font-semibold text-[var(--brand-text)]">
                    Sign-in
                  </th>
                  <th className="pb-3 text-left font-semibold text-[var(--brand-text)]">
                    Lead status
                  </th>
                  <th className="pb-3 text-left font-semibold text-[var(--brand-text)]">
                    Notes
                  </th>
                  <th className="pb-3 w-[80px]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--brand-border)]">
                {visitors.map((v) => (
                  <tr key={v.id} className="hover:bg-[var(--brand-surface-alt)]/50">
                    <td className="py-3 font-medium text-[var(--brand-text)]">
                      {fullName(v.contact)}
                    </td>
                    <td className="py-3 text-[var(--brand-text-muted)]">
                      {v.contact.email ?? "—"}
                    </td>
                    <td className="py-3 text-[var(--brand-text-muted)]">
                      {v.contact.phone ?? "—"}
                    </td>
                    <td className="py-3 text-[var(--brand-text-muted)]">
                      {v.openHouse.title}
                    </td>
                    <td className="py-3 text-[var(--brand-text-muted)]">
                      {formatAddress(v.openHouse.property)}
                    </td>
                    <td className="py-3 text-[var(--brand-text-muted)]">
                      {formatDateTime(v.submittedAt)}
                    </td>
                    <td className="py-3">
                      <LeadStatusBadge status={v.leadStatus} />
                    </td>
                    <td className="py-3 max-w-[160px]">
                      <span
                        className="block truncate text-[var(--brand-text-muted)]"
                        title={v.contact.notes ?? undefined}
                      >
                        {v.contact.notes
                          ? v.contact.notes.length > 60
                            ? `${v.contact.notes.slice(0, 60)}…`
                            : v.contact.notes
                          : "—"}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/showing-hq/visitors/${v.id}`}>
                            View profile
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/contacts/${v.contact.id}`}>
                            Contact
                          </Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </BrandCard>
    </div>
  );
}
