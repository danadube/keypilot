"use client";

import Link from "next/link";
import { BrandCard } from "@/components/ui/BrandCard";
import { BrandButton } from "@/components/ui/BrandButton";
import { Button } from "@/components/ui/button";
import {
  Home,
  Calendar,
  Mail,
  QrCode,
  Users,
  Send,
  Check,
  Sparkles,
  Palette,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface GettingStartedStep {
  id: string;
  label: string;
  href: string;
  done: boolean;
  icon: React.ReactNode;
}

export interface GettingStartedCardProps {
  steps: GettingStartedStep[];
  onDismiss?: () => void;
  className?: string;
}

export function GettingStartedCard({
  steps,
  onDismiss,
  className,
}: GettingStartedCardProps) {
  const completed = steps.filter((s) => s.done).length;
  const total = steps.length;
  const nextStep = steps.find((s) => !s.done);

  return (
    <BrandCard elevated padded className={cn("relative overflow-hidden", className)}>
      <div
        className="pointer-events-none absolute right-0 top-0 h-24 w-32 bg-gradient-to-l from-[var(--brand-primary)]/5 to-transparent"
        aria-hidden
      />
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2
                className="font-semibold text-[var(--brand-text)]"
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "var(--text-h3-size)",
                }}
              >
                Get started with ShowingHQ
              </h2>
              <p className="mt-0.5 text-sm text-[var(--brand-text-muted)]">
                Six steps to capture leads and follow up like a pro
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-sm font-medium text-[var(--brand-text-muted)]">
              {completed}/{total}
            </span>
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                className="font-semibold text-[var(--brand-text-muted)] hover:bg-[var(--brand-surface-alt)] hover:text-[var(--brand-text)]"
                onClick={onDismiss}
              >
                Dismiss
              </Button>
            )}
          </div>
        </div>
        {nextStep && (
          <div className="rounded-lg border-2 border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/5 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--brand-text-muted)]">
              Your next step
            </p>
            <Link
              href={nextStep.href}
              className="flex items-center gap-3 text-left transition-opacity hover:opacity-90"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]">
                {nextStep.icon}
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-semibold text-[var(--brand-text)]">{nextStep.label}</span>
                <p className="mt-0.5 text-sm text-[var(--brand-text-muted)]">
                  Click to get started
                </p>
              </div>
              <BrandButton variant="primary" size="sm" asChild>
                <span>Do it now →</span>
              </BrandButton>
            </Link>
          </div>
        )}
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((step) => (
            <li key={step.id}>
              <Link
                href={step.href}
                className={cn(
                  "group flex items-center gap-3 rounded-lg border p-4 transition-colors",
                  step.done
                    ? "border-[var(--brand-border)] bg-[var(--brand-surface-alt)]/50"
                    : "border-[var(--brand-border)] bg-[var(--brand-surface)] hover:border-[var(--brand-primary)]/30 hover:bg-[var(--brand-surface-alt)]"
                )}
              >
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    step.done
                      ? "bg-[var(--brand-secondary)]/20 text-[var(--brand-secondary)]"
                      : "bg-[var(--brand-surface-alt)] text-[var(--brand-text-muted)] group-hover:bg-[var(--brand-primary)]/10 group-hover:text-[var(--brand-primary)]"
                  )}
                >
                  {step.done ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    step.icon
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "font-medium",
                      step.done
                        ? "text-[var(--brand-text-muted)] line-through"
                        : "text-[var(--brand-text)]"
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {!step.done && (
                  <span className="text-sm font-medium text-[var(--brand-primary)] group-hover:underline">
                    Start →
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </BrandCard>
  );
}

/** Order matches real agent workflow: create OH → sign-in → first visitor → integrations → branding → follow-up */
export function buildGettingStartedSteps(params: {
  hasOpenHouse: boolean;
  hasCalendar: boolean;
  hasGmail: boolean;
  hasVisitors: boolean;
  hasFollowUps: boolean;
  hasBranding?: boolean;
}): GettingStartedStep[] {
  const { hasOpenHouse, hasCalendar, hasGmail, hasVisitors, hasFollowUps, hasBranding = false } =
    params;
  return [
    {
      id: "open-house",
      label: "Create your first open house",
      href: "/open-houses/new",
      done: hasOpenHouse,
      icon: <Home className="h-5 w-5" />,
    },
    {
      id: "sign-in",
      label: "Set up your sign-in page",
      href: "/open-houses/sign-in",
      done: hasOpenHouse,
      icon: <QrCode className="h-5 w-5" />,
    },
    {
      id: "visitors",
      label: "Get your first visitor",
      href: "/showing-hq/visitors",
      done: hasVisitors,
      icon: <Users className="h-5 w-5" />,
    },
    {
      id: "gmail",
      label: "Connect Gmail",
      href: "/api/v1/auth/google/connect?service=gmail",
      done: hasGmail,
      icon: <Mail className="h-5 w-5" />,
    },
    {
      id: "calendar",
      label: "Connect Google Calendar",
      href: "/api/v1/auth/google/connect?service=google_calendar",
      done: hasCalendar,
      icon: <Calendar className="h-5 w-5" />,
    },
    {
      id: "branding",
      label: "Personalize your brand",
      href: "/settings/branding",
      done: hasBranding,
      icon: <Palette className="h-5 w-5" />,
    },
    {
      id: "follow-up",
      label: "Follow up with leads",
      href: "/showing-hq/follow-ups",
      done: hasFollowUps,
      icon: <Send className="h-5 w-5" />,
    },
  ];
}
