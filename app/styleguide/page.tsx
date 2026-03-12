"use client";

import * as React from "react";
import Link from "next/link";
import { BrandProvider } from "@/design-system/brand-context";
import { BrandButton } from "@/components/ui/BrandButton";
import { BrandCard } from "@/components/ui/BrandCard";
import { BrandBadge } from "@/components/ui/BrandBadge";
import { BrandInput } from "@/components/ui/BrandInput";
import { BrandSectionHeader } from "@/components/ui/BrandSectionHeader";
import { BrandContainer } from "@/components/ui/BrandContainer";
import { themes } from "@/design-system/theme-registry";
import type { BrandKey } from "@/design-system/tokens";
import { cn } from "@/lib/utils";

const brandKeys: BrandKey[] = ["keypilot", "danadube", "glaab", "siu"];

function BrandShowcase({ brand }: { brand: BrandKey }) {
  const theme = themes[brand];
  return (
    <BrandProvider brand={brand}>
      <section
        id={`brand-showcase-${brand}`}
        role="tabpanel"
        aria-labelledby={`brand-tab-${brand}`}
        className="rounded-[var(--radius-lg)] border border-[var(--brand-border)] bg-[var(--brand-surface)] p-[var(--space-md)] shadow-[var(--shadow-sm)]"
        style={{ fontFamily: "var(--font-body)" }}
      >
        <div className="mb-[var(--space-md)] border-b border-[var(--brand-border)] pb-[var(--space-sm)]">
          <h3 className="text-lg font-semibold text-[var(--brand-text)]">
            {theme.metadata.name}
          </h3>
          <p className="text-sm text-[var(--brand-text-muted)]">{theme.metadata.tagline}</p>
        </div>

        <div className="stack-lg">
          {/* Spacing scale */}
          <div>
            <h4 className="mb-[var(--space-sm)] text-sm font-medium uppercase tracking-wider text-[var(--brand-text-muted)]">
              8-Point Grid — Spacing Scale
            </h4>
            <div className="flex flex-wrap items-end gap-[var(--space-sm)]">
              {SPACING_KEYS.map((s) => (
                <SpacingBar
                  key={s}
                  size={s}
                  label={`${s} (${s === "xs" ? 8 : s === "sm" ? 16 : s === "md" ? 24 : s === "lg" ? 32 : s === "xl" ? 40 : s === "2xl" ? 48 : s === "3xl" ? 64 : s === "4xl" ? 80 : 96}px)`}
                />
              ))}
            </div>
          </div>

          {/* Typography scale */}
          <div>
            <h4 className="mb-[var(--space-sm)] text-sm font-medium uppercase tracking-wider text-[var(--brand-text-muted)]">
              Typography Scale (8px grid)
            </h4>
            <div
              className="stack-md rounded-[var(--radius-md)] p-[var(--space-md)]"
              style={{
                background: "var(--brand-bg)",
                color: "var(--brand-text)",
              }}
            >
              <p style={{ fontFamily: "var(--font-heading)", fontSize: "var(--text-h1-size)", lineHeight: "var(--text-h1-line)", fontWeight: "var(--text-h1-weight)" }}>
                H1 — 48px / 56px
              </p>
              <p style={{ fontFamily: "var(--font-heading)", fontSize: "var(--text-h2-size)", lineHeight: "var(--text-h2-line)", fontWeight: "var(--text-h2-weight)" }}>
                H2 — 36px / 44px
              </p>
              <p style={{ fontFamily: "var(--font-heading)", fontSize: "var(--text-h3-size)", lineHeight: "var(--text-h3-line)", fontWeight: "var(--text-h3-weight)" }}>
                H3 — 30px / 38px
              </p>
              <p style={{ fontFamily: "var(--font-heading)", fontSize: "var(--text-h4-size)", lineHeight: "var(--text-h4-line)", fontWeight: "var(--text-h4-weight)" }}>
                H4 — 24px / 32px
              </p>
              <p style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-body-size)", lineHeight: "var(--text-body-line)" }}>
                Body — 16px / 24px
              </p>
              <p style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-small-size)", lineHeight: "var(--text-small-line)" }}>
                Small — 14px / 20px
              </p>
              <p style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-caption-size)", lineHeight: "var(--text-caption-line)" }}>
                Caption — 16px / 24px
              </p>
            </div>
          </div>

          {/* Colors */}
          <div>
            <h4 className="mb-[var(--space-sm)] text-sm font-medium uppercase tracking-wider text-[var(--brand-text-muted)]">
              Colors
            </h4>
            <div className="flex flex-wrap gap-[var(--space-sm)]">
              <ColorSwatch label="Primary" color={theme.colors.primary} />
              <ColorSwatch label="Secondary" color={theme.colors.secondary} />
              <ColorSwatch label="Accent" color={theme.colors.accent} />
              <ColorSwatch label="Success" color={theme.colors.success} />
              <ColorSwatch label="Warning" color={theme.colors.warning} />
              <ColorSwatch label="Danger" color={theme.colors.danger} />
            </div>
          </div>

          {/* Typography */}
          <div>
            <h4 className="mb-[var(--space-sm)] text-sm font-medium uppercase tracking-wider text-[var(--brand-text-muted)]">
              Typography
            </h4>
            <div
              className="stack-sm"
              style={{
                background: "var(--brand-bg)",
                color: "var(--brand-text)",
                padding: "var(--space-md)",
                borderRadius: "var(--radius-md)",
              }}
            >
              <p style={{ fontFamily: "var(--font-heading)", fontSize: "var(--text-h1-size)", lineHeight: "var(--text-h1-line)", fontWeight: "var(--text-h1-weight)" }}>
                Heading 1 — The quick brown fox
              </p>
              <p style={{ fontFamily: "var(--font-heading)", fontSize: "var(--text-h2-size)", lineHeight: "var(--text-h2-line)", fontWeight: "var(--text-h2-weight)" }}>
                Heading 2 — Jumps over the lazy dog
              </p>
              <p style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-body-size)", lineHeight: "var(--text-body-line)" }}>
                Body — Lorem ipsum dolor sit amet, consectetur adipiscing elit.
              </p>
              <p style={{ fontFamily: "var(--font-body)", fontSize: "var(--text-small-size)" }}>
                Small — Caption and secondary text.
              </p>
            </div>
          </div>

          {/* Buttons */}
          <div>
            <h4 className="mb-[var(--space-sm)] text-sm font-medium uppercase tracking-wider text-[var(--brand-text-muted)]">
              Buttons
            </h4>
            <div className="flex flex-wrap gap-[var(--space-md)]">
              <BrandButton variant="primary">Primary</BrandButton>
              <BrandButton variant="secondary">Secondary</BrandButton>
              <BrandButton variant="ghost">Ghost</BrandButton>
              <BrandButton variant="danger">Danger</BrandButton>
              <BrandButton variant="primary" size="sm">Small</BrandButton>
              <BrandButton variant="primary" size="lg">Large</BrandButton>
            </div>
          </div>

          {/* Badges */}
          <div>
            <h4 className="mb-[var(--space-sm)] text-sm font-medium uppercase tracking-wider text-[var(--brand-text-muted)]">
              Badges
            </h4>
            <div className="flex flex-wrap gap-[var(--space-sm)]">
              <BrandBadge tone="default">Default</BrandBadge>
              <BrandBadge tone="success">Success</BrandBadge>
              <BrandBadge tone="warning">Warning</BrandBadge>
              <BrandBadge tone="danger">Danger</BrandBadge>
              <BrandBadge tone="accent">Accent</BrandBadge>
            </div>
          </div>

          {/* Input */}
          <div>
            <h4 className="mb-[var(--space-sm)] text-sm font-medium uppercase tracking-wider text-[var(--brand-text-muted)]">
              Input
            </h4>
            <div className="stack-md max-w-xs">
              <BrandInput label="Label" placeholder="Placeholder text" />
              <BrandInput label="With hint" hint="Helper text here" />
              <BrandInput label="With error" error="This field is required" />
            </div>
          </div>

          {/* Card */}
          <div>
            <h4 className="mb-[var(--space-sm)] text-sm font-medium uppercase tracking-wider text-[var(--brand-text-muted)]">
              Card
            </h4>
            <BrandCard>
              <BrandSectionHeader
                eyebrow="Section"
                title="Card with section header"
                description="Card padding = spacing.md (24px). Section containers use spacing.2xl."
              />
            </BrandCard>
          </div>

          {/* Layout examples */}
          <div>
            <h4 className="mb-[var(--space-sm)] text-sm font-medium uppercase tracking-wider text-[var(--brand-text-muted)]">
              Layout — 8-Point Grid Examples
            </h4>
            <div className="stack-lg">
              <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--brand-border)] p-[var(--space-2xl)]">
                <p className="text-[var(--brand-text-muted)]" style={{ fontSize: "var(--text-small-size)" }}>
                  Section container — padding: spacing.2xl (48px)
                </p>
              </div>
              <div className="stack-md">
                <BrandButton variant="primary">Button — py: xs (8px), px: sm (16px)</BrandButton>
                <div className="stack-sm">
                  <BrandInput label="Form field" placeholder="Input — py: xs, px: sm" />
                  <BrandInput label="Another field" placeholder="Form layout uses stack-sm" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </BrandProvider>
  );
}

const SPACING_KEYS = ["xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl", "5xl"] as const;

function SpacingBar({ size, label }: { size: (typeof SPACING_KEYS)[number]; label: string }) {
  const varName = `--space-${size}`;
  return (
    <div className="flex flex-col items-center gap-[var(--space-xs)]">
      <div
        className="w-8 rounded bg-[var(--brand-primary)] opacity-80"
        style={{ height: `var(${varName})` }}
      />
      <span className="text-[var(--brand-text-muted)]" style={{ fontSize: "var(--text-caption-size)" }}>
        {label}
      </span>
    </div>
  );
}

function ColorSwatch({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-[var(--space-xs)]">
      <div
        className="h-12 w-12 rounded-lg border border-[var(--brand-border)] shadow-[var(--shadow-sm)]"
        style={{ backgroundColor: color }}
      />
      <span className="text-xs text-[var(--brand-text-muted)]">{label}</span>
    </div>
  );
}

export default function StyleguidePage() {
  const [activeBrand, setActiveBrand] = React.useState<BrandKey>("keypilot");

  return (
    <BrandProvider brand="keypilot">
      <div
        className="min-h-screen"
        style={{ background: "var(--brand-bg)", color: "var(--brand-text)" }}
      >
        <header
          className="border-b"
          style={{
            borderColor: "var(--brand-border)",
            background: "var(--brand-surface)",
          }}
        >
          <BrandContainer>
            <div className="flex min-h-[56px] items-center justify-between">
              <Link href="/" className="font-semibold text-[var(--brand-text)]">
                ← KeyPilot
              </Link>
              <h1 className="text-lg font-medium text-[var(--brand-text)]">Design System Styleguide</h1>
              <div />
            </div>
          </BrandContainer>
      </header>

      <main className="py-[var(--space-2xl)]">
        <BrandContainer padding="page">
          <div
            className="mb-[var(--space-md)] flex gap-[var(--space-sm)]"
            role="tablist"
            aria-label="Select brand to preview"
          >
            {brandKeys.map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={activeBrand === key}
                aria-controls={`brand-showcase-${key}`}
                id={`brand-tab-${key}`}
                onClick={() => setActiveBrand(key)}
                className={cn(
                  "rounded-[var(--radius-md)] py-[var(--space-xs)] px-[var(--space-sm)] text-sm font-medium transition-colors",
                  activeBrand === key
                    ? "bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)]"
                    : "bg-[var(--brand-surface)] text-[var(--brand-text-muted)] border border-[var(--brand-border)] hover:bg-[var(--brand-surface-alt)]"
                )}
              >
                {themes[key].metadata.name}
              </button>
            ))}
          </div>

          <BrandShowcase brand={activeBrand} />
        </BrandContainer>
      </main>
    </div>
    </BrandProvider>
  );
}
