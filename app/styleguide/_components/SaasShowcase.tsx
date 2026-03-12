"use client";

import * as React from "react";
import { BrandProvider } from "@/design-system/brand-context";
import { BrandPageHeader } from "@/components/ui/BrandPageHeader";
import { BrandStatCard } from "@/components/ui/BrandStatCard";
import { BrandKpiRow } from "@/components/ui/BrandKpiRow";
import { BrandTable, BrandTableBody, BrandTableRow, BrandTableCell } from "@/components/ui/BrandTable";
import { BrandTableToolbar } from "@/components/ui/BrandTableToolbar";
import { BrandSearchInput } from "@/components/ui/BrandSearchInput";
import { BrandFilterBar } from "@/components/ui/BrandFilterBar";
import { BrandButton } from "@/components/ui/BrandButton";
import { BrandBadge } from "@/components/ui/BrandBadge";
import { BrandModal } from "@/components/ui/BrandModal";
import { BrandTabs } from "@/components/ui/BrandTabs";
import { BrandAlert } from "@/components/ui/BrandAlert";
import { BrandEmptyState } from "@/components/ui/BrandEmptyState";
import { BrandDataCard } from "@/components/ui/BrandDataCard";
import { BrandSidebarNav } from "@/components/ui/BrandSidebarNav";
import { BrandTopbar } from "@/components/ui/BrandTopbar";
import { BrandInput } from "@/components/ui/BrandInput";
import { BrandTextarea } from "@/components/ui/BrandTextarea";
import { BrandSelect } from "@/components/ui/BrandSelect";
import { Home, FileText, Users, Calendar, Building2, BarChart3 } from "lucide-react";

const MOCK_PROPERTIES = [
  { id: "1", address: "479 Desert Holly Dr", city: "Palm Desert", status: "Active", price: "$782,800" },
  { id: "2", address: "123 Main St", city: "Palm Desert", status: "Active", price: "$495,000" },
];

const MOCK_LEADS = [
  { name: "Sarah M.", source: "QR", date: "Today" },
  { name: "James K.", source: "Tablet", date: "Today" },
  { name: "Elena R.", source: "QR", date: "Yesterday" },
];

export function SaasShowcase() {
  const [modalOpen, setModalOpen] = React.useState(false);

  return (
    <BrandProvider brand="keypilot">
      <div className="stack-lg">
        <section>
          <h2
            className="mb-[var(--space-md)] font-semibold text-[var(--brand-text)]"
            style={{ fontFamily: "var(--font-heading)", fontSize: "var(--text-h2-size)", lineHeight: "var(--text-h2-line)" }}
          >
            SaaS Components
          </h2>

          <div className="stack-lg">
            {/* Page header */}
            <BrandPageHeader
              title="Dashboard"
              description="Overview of your properties and open houses"
              actions={<BrandButton>Add property</BrandButton>}
            />

            {/* KPI row */}
            <BrandKpiRow columns={4}>
              <BrandStatCard
                title="Active listings"
                value="12"
                change="+2 this week"
                trend="up"
                icon={<Building2 className="h-5 w-5" />}
              />
              <BrandStatCard
                title="Tasks due today"
                value="3"
                change="1 overdue"
                trend="down"
                icon={<Calendar className="h-5 w-5" />}
              />
              <BrandStatCard
                title="New leads"
                value="47"
                change="+12%"
                trend="up"
                icon={<Users className="h-5 w-5" />}
              />
              <BrandStatCard
                title="Reports generated"
                value="28"
                change="This month"
                trend="neutral"
                icon={<FileText className="h-5 w-5" />}
              />
            </BrandKpiRow>

            {/* Table with toolbar */}
            <div className="stack-md">
              <BrandPageHeader title="Properties" description="Your active and past listings" />
              <BrandTableToolbar
                search={<BrandSearchInput placeholder="Search properties..." />}
                filters={
                  <BrandFilterBar>
                    <BrandButton variant="secondary" size="sm">
                      Status
                    </BrandButton>
                    <BrandButton variant="secondary" size="sm">
                      Date
                    </BrandButton>
                  </BrandFilterBar>
                }
                actions={<BrandButton>Add property</BrandButton>}
              />
              <BrandTable
                columns={["Address", "City", "Status", "Price", ""]}
                emptyState={
                  <BrandEmptyState
                    title="No properties yet"
                    description="Add your first property to get started."
                    action={<BrandButton>Add property</BrandButton>}
                  />
                }
              >
                {MOCK_PROPERTIES.length > 0 ? (
                  <BrandTableBody>
                    {MOCK_PROPERTIES.map((p) => (
                      <BrandTableRow key={p.id}>
                        <BrandTableCell className="font-medium">{p.address}</BrandTableCell>
                        <BrandTableCell>{p.city}</BrandTableCell>
                        <BrandTableCell><BrandBadge tone="success">{p.status}</BrandBadge></BrandTableCell>
                        <BrandTableCell>{p.price}</BrandTableCell>
                        <BrandTableCell>
                          <BrandButton variant="ghost" size="sm">
                            View
                          </BrandButton>
                        </BrandTableCell>
                      </BrandTableRow>
                    ))}
                  </BrandTableBody>
                ) : null}
              </BrandTable>
            </div>

            {/* Alerts */}
            <div className="stack-md">
              <h3 className="font-medium text-[var(--brand-text)]" style={{ fontSize: "var(--text-h4-size)" }}>
                Alerts
              </h3>
              <BrandAlert tone="info" title="Tip">
                Use the QR code on your tablet to let visitors sign in at open houses.
              </BrandAlert>
              <BrandAlert tone="success" title="Report ready">
                Seller report for 479 Desert Holly Dr has been generated.
              </BrandAlert>
              <BrandAlert tone="warning" title="Follow-up pending">
                3 contacts from last week need a follow-up.
              </BrandAlert>
              <BrandAlert tone="danger" title="Action required">
                Your RentCast API key will expire soon. Update it in settings.
              </BrandAlert>
            </div>

            {/* Tabs */}
            <BrandTabs
              tabs={[
                { key: "overview", label: "Overview", content: <p className="text-[var(--brand-text-muted)]" style={{ fontSize: "var(--text-body-size)" }}>Overview content goes here.</p> },
                { key: "activity", label: "Activity", badge: 5, content: <p className="text-[var(--brand-text-muted)]">Recent activity and tasks.</p> },
                { key: "settings", label: "Settings", content: <p className="text-[var(--brand-text-muted)]">Account and app settings.</p> },
              ]}
              defaultTab="overview"
            />

            {/* Modal */}
            <div>
              <BrandButton onClick={() => setModalOpen(true)}>Open modal</BrandButton>
              <BrandModal
                open={modalOpen}
                onOpenChange={setModalOpen}
                title="Example modal"
                description="A polished modal for confirmations and forms."
                footer={
                  <>
                    <BrandButton variant="secondary" onClick={() => setModalOpen(false)}>
                      Cancel
                    </BrandButton>
                    <BrandButton onClick={() => setModalOpen(false)}>Confirm</BrandButton>
                  </>
                }
              >
                <p className="text-[var(--brand-text-muted)]" style={{ fontSize: "var(--text-body-size)" }}>
                  Modal content can include forms, confirmations, or any other content.
                </p>
              </BrandModal>
            </div>

            {/* Empty state */}
            <BrandEmptyState
              title="No results"
              description="Try adjusting your filters or search term."
              action={<BrandButton variant="secondary">Clear filters</BrandButton>}
              icon={<BarChart3 className="h-12 w-12 text-[var(--brand-text-muted)]" />}
            />

            {/* Form row */}
            <div className="stack-md">
              <h3 className="font-medium text-[var(--brand-text)]" style={{ fontSize: "var(--text-h4-size)" }}>
                Form example
              </h3>
              <div className="grid gap-[var(--space-md)] sm:grid-cols-2">
                <BrandInput label="Property name" placeholder="Enter name" />
                <BrandSelect
                  label="Status"
                  options={[
                    { label: "Draft", value: "draft" },
                    { label: "Active", value: "active" },
                    { label: "Sold", value: "sold" },
                  ]}
                  placeholder="Select status"
                />
              </div>
              <BrandTextarea label="Notes" placeholder="Add notes..." rows={4} />
              <div className="flex gap-[var(--space-sm)]">
                <BrandButton>Save</BrandButton>
                <BrandButton variant="secondary">Cancel</BrandButton>
              </div>
            </div>
          </div>
        </section>

        {/* KeyPilot Dashboard Mock */}
        <section>
          <h2
            className="mb-[var(--space-md)] font-semibold text-[var(--brand-text)]"
            style={{ fontFamily: "var(--font-heading)", fontSize: "var(--text-h2-size)", lineHeight: "var(--text-h2-line)" }}
          >
            KeyPilot dashboard mock
          </h2>
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--brand-border)] bg-[var(--brand-surface)] shadow-[var(--shadow-sm)]">
            <div className="flex min-h-[400px]">
              <BrandSidebarNav
                title="KeyPilot"
                items={[
                  { label: "Dashboard", href: "#", icon: <Home className="h-5 w-5" />, active: true },
                  { label: "Properties", href: "#", icon: <Building2 className="h-5 w-5" /> },
                  { label: "Open houses", href: "#", icon: <Calendar className="h-5 w-5" /> },
                  { label: "Contacts", href: "#", icon: <Users className="h-5 w-5" />, badge: 12 },
                ]}
              />
              <div className="flex-1 overflow-auto">
                <BrandTopbar
                  title="Dashboard"
                  right={<BrandBadge tone="accent">KeyPilot</BrandBadge>}
                />
                <div className="p-[var(--space-md)]">
                  <BrandKpiRow columns={4}>
                    <BrandStatCard title="Active listings" value="12" change="+2" trend="up" />
                    <BrandStatCard title="Tasks due today" value="3" change="1 overdue" trend="down" />
                    <BrandStatCard title="New leads" value="47" change="+12%" trend="up" />
                    <BrandStatCard title="Reports" value="28" change="This month" trend="neutral" />
                  </BrandKpiRow>
                  <div className="mt-[var(--space-lg)] grid gap-[var(--space-md)] sm:grid-cols-2">
                    <BrandDataCard
                      title="Recent leads"
                      eyebrow="Last 7 days"
                      actions={<BrandButton variant="ghost" size="sm">View all</BrandButton>}
                    >
                      <ul className="stack-sm">
                        {MOCK_LEADS.map((l, i) => (
                          <li key={i} className="flex items-center justify-between text-[var(--brand-text)]" style={{ fontSize: "var(--text-small-size)" }}>
                            <span>{l.name}</span>
                            <span className="text-[var(--brand-text-muted)]">{l.source} · {l.date}</span>
                          </li>
                        ))}
                      </ul>
                    </BrandDataCard>
                    <BrandDataCard
                      title="Upcoming open houses"
                      eyebrow="This week"
                      actions={<BrandButton variant="ghost" size="sm">Calendar</BrandButton>}
                    >
                      <div className="stack-sm">
                        <p className="text-[var(--brand-text-muted)]" style={{ fontSize: "var(--text-small-size)" }}>
                          Sat 10am — 479 Desert Holly Dr
                        </p>
                        <p className="text-[var(--brand-text-muted)]" style={{ fontSize: "var(--text-small-size)" }}>
                          Sun 2pm — 123 Main St
                        </p>
                      </div>
                    </BrandDataCard>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </BrandProvider>
  );
}
