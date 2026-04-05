/**
 * KeyPilot product roadmap — static v1.
 * Edit categories and items here; icons are resolved in the roadmap page by key.
 */

export type RoadmapStatus = "planned" | "in_progress" | "beta" | "live";

/** Lucide icon name (PascalCase) — must exist in `ROADMAP_ICON_KEYS` on the page. */
export type RoadmapIconKey =
  | "LayoutGrid"
  | "Mail"
  | "Calendar"
  | "Contact"
  | "Cloud"
  | "Building2"
  | "GitBranch"
  | "FileSignature"
  | "Megaphone"
  | "CheckSquare"
  | "Smartphone"
  | "Palette"
  | "Shield"
  | "Import"
  | "Sparkles"
  | "Wallet";

export type RoadmapItemConfig = {
  id: string;
  icon: RoadmapIconKey;
  title: string;
  description: string;
  /** Version or timeframe hint, e.g. "v1.2" or "2026 H1" */
  milestone: string;
  status: RoadmapStatus;
};

export type RoadmapCategoryConfig = {
  id: string;
  title: string;
  description?: string;
  items: RoadmapItemConfig[];
};

export const KEYPILOT_ROADMAP_CATEGORIES: RoadmapCategoryConfig[] = [
  {
    id: "core-modules",
    title: "Core Modules",
    description: "Foundational workflows across listings, pipeline, and daily operations.",
    items: [
      {
        id: "mls-listing-sync",
        icon: "Building2",
        title: "MLS / Listing Sync",
        description:
          "Deeper listing ingestion, photo sync, and field mapping so PropertyVault stays aligned with the MLS.",
        milestone: "2026 H1",
        status: "planned",
      },
      {
        id: "transaction-pipeline",
        icon: "GitBranch",
        title: "Transaction Pipeline",
        description:
          "Visual deal stages, checkpoints, and handoffs from offer through close inside KeyPilot.",
        milestone: "v1.x",
        status: "in_progress",
      },
      {
        id: "task-reminders",
        icon: "CheckSquare",
        title: "Task Management & Reminders",
        description:
          "Cross-module tasks, due dates, and lightweight accountability tied to contacts and deals.",
        milestone: "Live",
        status: "live",
      },
      {
        id: "mobile-app",
        icon: "Smartphone",
        title: "Mobile App",
        description:
          "Native-quality mobile experience for showings check-in, quick CRM updates, and notifications.",
        milestone: "2026+",
        status: "planned",
      },
    ],
  },
  {
    id: "communication-google",
    title: "Communication & Google",
    description: "Email, calendar, and workspace connectivity.",
    items: [
      {
        id: "gmail-integration",
        icon: "Mail",
        title: "Gmail Integration",
        description:
          "Secure Gmail connectivity for parsing, threading, and operational workflows (e.g. showing-related mail).",
        milestone: "Live",
        status: "live",
      },
      {
        id: "google-calendar",
        icon: "Calendar",
        title: "Google Calendar Integration",
        description:
          "Two-way sync for showings, open houses, and follow-ups with conflict-aware scheduling.",
        milestone: "2026 H1",
        status: "in_progress",
      },
      {
        id: "google-contacts",
        icon: "Contact",
        title: "Google Contacts Sync",
        description:
          "Optional sync paths between Google contacts and ClientKeep with clear merge rules.",
        milestone: "2026 H2",
        status: "planned",
      },
      {
        id: "google-drive",
        icon: "Cloud",
        title: "Google Drive Integration",
        description:
          "Attach and link Drive files to properties, transactions, and shared deal rooms.",
        milestone: "2026 H2",
        status: "planned",
      },
    ],
  },
  {
    id: "transactions-forms",
    title: "Transactions & Forms",
    description: "Deal paperwork, e-sign, and brokerage-ready exports.",
    items: [
      {
        id: "forms-docusign-zipforms",
        icon: "FileSignature",
        title: "Forms / DocuSign / ZIPForms",
        description:
          "Templates, packet assembly, and e-sign handoffs with audit-friendly status in the deal record.",
        milestone: "2026 H1",
        status: "planned",
      },
      {
        id: "commissions-exports",
        icon: "Wallet",
        title: "Commission & Brokerage Exports",
        description:
          "Richer commission splits, export formats, and reconciliation helpers for back-office teams.",
        milestone: "Beta",
        status: "beta",
      },
    ],
  },
  {
    id: "marketing-automation",
    title: "Marketing & Automation",
    description: "Campaigns, nurture, and intelligent assistance.",
    items: [
      {
        id: "marketing-module",
        icon: "Megaphone",
        title: "Marketing Module",
        description:
          "MarketPilot-style campaigns, audiences, and performance summaries tied to your CRM.",
        milestone: "v1",
        status: "beta",
      },
      {
        id: "ai-briefings",
        icon: "Sparkles",
        title: "AI Briefings / Suggested Actions",
        description:
          "Contextual summaries and next-best-action hints across ShowingHQ, ClientKeep, and open houses.",
        milestone: "Live",
        status: "live",
      },
    ],
  },
  {
    id: "platform-security",
    title: "Platform / Security / Admin",
    description: "Trust, branding, and operator controls.",
    items: [
      {
        id: "branding-white-label",
        icon: "Palette",
        title: "Branding & White Label",
        description:
          "Logo, colors, and outbound identity so client-facing pages feel like your brokerage.",
        milestone: "v1",
        status: "in_progress",
      },
      {
        id: "security-permissions",
        icon: "Shield",
        title: "Security & Permissions",
        description:
          "Role-based access, audit logs, and finer-grained controls for teams and assistants.",
        milestone: "2026",
        status: "in_progress",
      },
      {
        id: "imports-exports",
        icon: "Import",
        title: "Enhanced Imports / Exports",
        description:
          "CSV/XLSX pipelines, mailing labels, and bulk operations across farms and contacts.",
        milestone: "Live",
        status: "live",
      },
      {
        id: "platform-foundation",
        icon: "LayoutGrid",
        title: "Modular Platform Architecture",
        description:
          "Consistent APIs, RLS-backed data access, and module boundaries that scale new surfaces safely.",
        milestone: "Ongoing",
        status: "live",
      },
    ],
  },
];

export const ROADMAP_ABOUT_COPY = {
  title: "About the Roadmap",
  body: [
    "This page is a directional view of what we are building across KeyPilot. Timelines and scope can shift as we learn from agents and brokerages in production.",
    "Items marked Live are available today in some form; Beta means early access or partial coverage; In Progress is actively under development; Planned is committed direction without a fixed ship date.",
    "Have a priority or partnership in mind? Use Feedback from the sidebar or reach out — we weigh every signal when we sequence the platform.",
  ],
} as const;
