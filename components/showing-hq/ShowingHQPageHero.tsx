"use client";

import * as React from "react";

export interface ShowingHQPageHeroProps {
  title: string;
  description?: string;
  /** Optional primary action (e.g. "Schedule Showing" button) */
  action?: React.ReactNode;
}

/**
 * Page-level hero under the app shell: page title and context only (module name
 * lives in the global header). Light surface so it reads secondary to the shell.
 */
export function ShowingHQPageHero({
  title,
  description,
  action,
}: ShowingHQPageHeroProps) {
  return (
    <header
      className="relative rounded-xl border border-kp-outline bg-kp-surface px-5 py-4 sm:px-6 sm:py-5"
      role="banner"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold tracking-tight text-kp-on-surface md:text-2xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-kp-on-surface-variant">
              {description}
            </p>
          ) : null}
        </div>
        {action ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2 pt-0.5 sm:pt-0">
            {action}
          </div>
        ) : null}
      </div>
    </header>
  );
}
