/**
 * KeyPilot product roadmap — static v1.
 * Edit categories and items here; icons are resolved in the roadmap page by key.
 *
 * Milestone chips use one vocabulary:
 * - Now — generally available
 * - Preview — early / partial access (pairs with Beta status)
 * - H1 2026 / H2 2026 / 2027+ — target windows for planned & in-flight work
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
  /** Target window — use Now / Preview / H1 2026 / H2 2026 / 2027+ for consistency */
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
    description:
      "Listings, pipeline, and day-to-day operations — so fewer handoffs and less context switching.",
    items: [
      {
        id: "mls-listing-sync",
        icon: "Building2",
        title: "MLS & listing alignment",
        description:
          "Keep PropertyVault truthful to the MLS: photos, fields, and status updates without manual double entry.",
        milestone: "H1 2026",
        status: "planned",
      },
      {
        id: "transaction-pipeline",
        icon: "GitBranch",
        title: "Visual transaction pipeline",
        description:
          "See every deal stage from offer to close with clear checkpoints — fewer dropped balls between agents and staff.",
        milestone: "H1 2026",
        status: "in_progress",
      },
      {
        id: "task-reminders",
        icon: "CheckSquare",
        title: "Tasks & reminders",
        description:
          "Turn follow-ups and deal to-dos into accountable work tied to contacts and transactions, not sticky notes.",
        milestone: "Now",
        status: "live",
      },
      {
        id: "mobile-app",
        icon: "Smartphone",
        title: "Mobile-first field workflows",
        description:
          "Check in showings, log touches, and get nudges on the go so the office isn’t the only place work happens.",
        milestone: "2027+",
        status: "planned",
      },
    ],
  },
  {
    id: "communication-google",
    title: "Communication & Google",
    description: "Meet agents where they already work — inbox, calendar, and files.",
    items: [
      {
        id: "gmail-integration",
        icon: "Mail",
        title: "Gmail in the loop",
        description:
          "Operational email (e.g. Supra and showing-related threads) lands in workflows instead of getting lost in the inbox.",
        milestone: "Now",
        status: "live",
      },
      {
        id: "google-calendar",
        icon: "Calendar",
        title: "Google Calendar sync",
        description:
          "Showings, open houses, and follow-ups stay two-way with Google Calendar so conflicts surface before they cost a deal.",
        milestone: "H1 2026",
        status: "in_progress",
      },
      {
        id: "google-contacts",
        icon: "Contact",
        title: "Google Contacts bridge",
        description:
          "Optional, rule-based sync into ClientKeep so prospect data doesn’t fork across Google and KeyPilot.",
        milestone: "H2 2026",
        status: "planned",
      },
      {
        id: "google-drive",
        icon: "Cloud",
        title: "Google Drive attachments",
        description:
          "Link deals and properties to the right Drive folders and files — one trail for the team.",
        milestone: "H2 2026",
        status: "planned",
      },
    ],
  },
  {
    id: "transactions-forms",
    title: "Transactions & Forms",
    description: "Paperwork, signatures, and numbers your brokerage can defend.",
    items: [
      {
        id: "forms-docusign-zipforms",
        icon: "FileSignature",
        title: "Forms, e-sign & ZIPforms",
        description:
          "Assemble packets, send for signature, and see status on the deal record — less chasing and fewer “where’s that doc?” moments.",
        milestone: "H1 2026",
        status: "planned",
      },
      {
        id: "commissions-exports",
        icon: "Wallet",
        title: "Commission & brokerage exports",
        description:
          "Splits and export formats your back office can reconcile — fewer spreadsheets between KeyPilot and accounting.",
        milestone: "Preview",
        status: "beta",
      },
    ],
  },
  {
    id: "marketing-automation",
    title: "Marketing & Automation",
    description: "Reach the right people and spend less time deciding what to do next.",
    items: [
      {
        id: "marketing-module",
        icon: "Megaphone",
        title: "Campaigns tied to the CRM",
        description:
          "Audiences and sends that respect your contact truth — so marketing isn’t a separate island from ClientKeep.",
        milestone: "Preview",
        status: "beta",
      },
      {
        id: "ai-briefings",
        icon: "Sparkles",
        title: "AI briefings & suggested actions",
        description:
          "Morning-style summaries and next steps across ShowingHQ and CRM surfaces — triage faster, miss less.",
        milestone: "Now",
        status: "live",
      },
    ],
  },
  {
    id: "platform-security",
    title: "Platform / Security / Admin",
    description: "Identity, scale, and the polish clients see on the way in.",
    items: [
      {
        id: "branding-white-label",
        icon: "Palette",
        title: "Branding & white-label surfaces",
        description:
          "Sign-in and client-facing pages feel like your brokerage, not a generic app — trust before the first click.",
        milestone: "H1 2026",
        status: "in_progress",
      },
      {
        id: "security-permissions",
        icon: "Shield",
        title: "Roles, permissions & audit",
        description:
          "Team-sized controls: who sees what, and a trail when it matters for compliance or disputes.",
        milestone: "H2 2026",
        status: "in_progress",
      },
      {
        id: "imports-exports",
        icon: "Import",
        title: "Imports, exports & bulk ops",
        description:
          "CSV, labels, and farm-scale updates without leaving KeyPilot — less copy-paste between tools.",
        milestone: "Now",
        status: "live",
      },
      {
        id: "platform-foundation",
        icon: "LayoutGrid",
        title: "Modular platform core",
        description:
          "Consistent APIs and RLS-backed access so new modules ship safely as KeyPilot grows.",
        milestone: "Now",
        status: "live",
      },
    ],
  },
];

export const ROADMAP_ABOUT_COPY = {
  title: "About the Roadmap",
  body: [
    "This page is directional: we sequence work based on production feedback from agents and brokerages. Dates can move when we learn something important.",
    "Milestones use a single scale — Now (generally available), Preview (early access), and H1 / H2 / 2027+ windows. Status chips add nuance: Live, Beta, In Progress, and Planned.",
    "We also maintain a longer-form phased plan (Client HQ, Command Center, Foundation vs Control tiers, automation horizons) in the repo as KeyPilot Roadmap v2 — it complements this milestone view for engineering and planning.",
    "Want something prioritized? Use Feedback in the sidebar or reach out directly — it shapes what we build next.",
  ],
} as const;
