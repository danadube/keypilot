"use client";

import * as React from "react";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";
import { ProductTierProvider } from "@/components/ProductTierProvider";
import { TopModuleNav } from "@/components/layout/TopModuleNav";
import { ModuleSidebar } from "@/components/layout/ModuleSidebar";

const SIDEBAR_WIDTH = 240;
const HEADER_HEIGHT = 64;
/** Fixed width for profile/actions — prevents overlap with module tabs */
const HEADER_RIGHT_WIDTH = 80;

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <ProductTierProvider>
    <div className="flex min-h-screen flex-col">
      {/* Header: grid-aligned with sidebar — brand (240px) | module nav | global controls */}
      <header
        className="sticky top-0 z-20 flex shrink-0 items-center border-b border-[var(--brand-border)] bg-[var(--brand-surface)]"
        style={{ height: HEADER_HEIGHT }}
      >
        {/* Left: KeyPilot brand area — same width as sidebar, matches dark sidebar */}
        <div
          className="flex shrink-0 items-center border-r border-[var(--brand-border)] overflow-hidden"
          style={{ width: SIDEBAR_WIDTH, height: HEADER_HEIGHT, backgroundColor: "var(--brand-sidebar-bg, #0B1A3C)" }}
        >
          <Link
            href="/"
            className="flex w-full transition-opacity hover:opacity-90"
          >
            <Image
              src="/KeyPilot-logo.png?v=4"
              alt="KeyPilot - The Real Estate Operations Platform"
              width={180}
              height={54}
              className="w-full h-auto brightness-0 invert"
              priority
            />
          </Link>
        </div>

        {/* Middle: Module navigation — scrollable, never overlaps right */}
        <div
          className="flex min-w-0 flex-1 items-center overflow-hidden pl-14 pr-4"
          style={{ maxWidth: `calc(100% - ${SIDEBAR_WIDTH + HEADER_RIGHT_WIDTH}px)` }}
        >
          <TopModuleNav />
        </div>

        {/* Right: Global controls — fixed width, collision-proof */}
        <div
          className="flex shrink-0 items-center justify-end gap-3 border-l border-[var(--brand-border)] bg-[var(--brand-surface)] pl-4 pr-4"
          style={{ width: HEADER_RIGHT_WIDTH }}
        >
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      {/* Main area: Sidebar (240px) + Content */}
      <div className="flex min-h-0 flex-1 bg-[var(--brand-bg)]">
        <ModuleSidebar />
        <main className="min-h-0 flex-1 overflow-auto p-8 md:p-10">
          <div className="mx-auto min-h-[50vh]" style={{ maxWidth: 1280 }}>
            {children}
          </div>
        </main>
      </div>
    </div>
    </ProductTierProvider>
  );
}
