"use client";

import * as React from "react";

export interface ShowingHQPageHeroProps {
  title: string;
  description?: string;
  /** Optional primary action (e.g. "Schedule Showing" button) */
  action?: React.ReactNode;
}

/**
 * Page hero matching the ShowingHQ dashboard design: dark navy banner,
 * title, description, optional primary action. Use on every ShowingHQ sub-page.
 */
export function ShowingHQPageHero({
  title,
  description,
  action,
}: ShowingHQPageHeroProps) {
  return (
    <header
      className="relative rounded-2xl bg-[#0B1A3C] px-8 py-8 shadow-2xl"
      role="banner"
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[#4BAED8]/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-widest text-[#7DD3F5] ring-1 ring-[#4BAED8]/40">
            ShowingHQ
          </span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div className="min-w-0 flex-1">
            <h1
              className="text-3xl font-extrabold tracking-tight text-white md:text-4xl"
              style={{ fontFamily: "var(--font-heading)", lineHeight: 1.1 }}
            >
              {title}
            </h1>
            {description ? (
              <p className="mt-1 max-w-2xl text-sm text-slate-300 md:text-base">
                {description}
              </p>
            ) : null}
          </div>
          {action ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2 pt-2 sm:pt-0">
              {action}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
