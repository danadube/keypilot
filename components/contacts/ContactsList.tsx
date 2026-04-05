"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { kpBtnTertiary } from "@/components/ui/kp-dashboard-button-tiers";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BrandPageHeader } from "@/components/ui/BrandPageHeader";
import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { useProductTier } from "@/components/ProductTierProvider";
import { UI_COPY } from "@/lib/ui-copy";

const STATUS_FILTER_OPTIONS = [
  { value: "__all__", label: "All statuses" },
  { value: "FARM", label: "Farm" },
  { value: "LEAD", label: "Lead" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "NURTURING", label: "Nurturing" },
  { value: "READY", label: "Ready" },
  { value: "LOST", label: "Lost" },
];

type Contact = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  source: string;
  status?: string | null;
  assignedToUserId?: string | null;
  assignedToUser?: { id: string; name: string } | null;
  contactTags?: { tag: { id: string; name: string } }[];
  createdAt: string;
};

export function ContactsList() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("__all__");
  const { hasCrm: hasCrmAccess } = useProductTier();

  const loadData = (status?: string) => {
    setError(null);
    setLoading(true);
    const url =
      status && status !== "__all__"
        ? `/api/v1/contacts?status=${encodeURIComponent(status)}`
        : "/api/v1/contacts";
    fetch(url)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) setError(json.error.message);
        else setContacts(json.data || []);
      })
      .catch(() => setError(UI_COPY.errors.load("contacts")))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData(statusFilter !== "__all__" ? statusFilter : undefined);
  }, [statusFilter]);

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
  };

  if (loading && contacts.length === 0) return <PageLoading />;
  if (error && contacts.length === 0)
    return (
      <ErrorMessage
        message={error}
        onRetry={() =>
          loadData(statusFilter !== "__all__" ? statusFilter : undefined)
        }
      />
    );

  return (
    <div className="flex flex-col gap-[var(--space-lg)]">
      <BrandPageHeader
        title="Contacts"
        description="Leads from open house sign-ins"
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Leads from open houses</CardTitle>
              <CardDescription>
                Contacts who signed in at your open house events
              </CardDescription>
            </div>
            {hasCrmAccess && (
              <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_FILTER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {contacts.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              <span className="block">{UI_COPY.empty.noneYet("contacts")}</span>
              <span className="mt-1 block text-sm">Share your QR sign-in link at open houses.</span>
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  {hasCrmAccess && <TableHead>Status</TableHead>}
                  {hasCrmAccess && <TableHead>Assigned</TableHead>}
                  {hasCrmAccess && <TableHead>Tags</TableHead>}
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      {c.firstName} {c.lastName}
                    </TableCell>
                    {hasCrmAccess && (
                      <TableCell>
                        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize">
                          {c.status || "Lead"}
                        </span>
                      </TableCell>
                    )}
                    {hasCrmAccess && (
                      <TableCell className="text-muted-foreground text-sm">
                        {c.assignedToUser?.name || "—"}
                      </TableCell>
                    )}
                    {hasCrmAccess && (
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(c.contactTags || []).slice(0, 3).map((ct) => (
                            <span
                              key={ct.tag.id}
                              className="rounded-full bg-primary/10 px-1.5 py-0.5 text-xs"
                            >
                              {ct.tag.name}
                            </span>
                          ))}
                          {(c.contactTags?.length ?? 0) > 3 && (
                            <span className="text-xs text-muted-foreground">
                              +{(c.contactTags?.length ?? 0) - 3}
                            </span>
                          )}
                        </div>
                      </TableCell>
                    )}
                    <TableCell>{c.email || "—"}</TableCell>
                    <TableCell>{c.phone || "—"}</TableCell>
                    <TableCell>{c.source}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className={kpBtnTertiary} asChild>
                        <Link href={`/contacts/${c.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
