"use client";

import * as React from "react";
import { UserButton } from "@clerk/nextjs";
import { ProductTierProvider } from "@/components/ProductTierProvider";
import { TopModuleNav } from "@/components/layout/TopModuleNav";
import { ModuleSidebar } from "@/components/layout/ModuleSidebar";

const HEADER_HEIGHT = 64;
/** Fixed width for profile/actions — prevents overlap with module tabs */
const HEADER_RIGHT_WIDTH = 80;

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <ProductTierProvider>
    <div className="flex min-h-screen bg-[var(--brand-bg)]">
      {/* Sidebar: full-height branded rail from top */}
      <ModuleSidebar />

      {/* Right: header bar + content */}
      <div className="flex min-h-0 flex-1 flex-col">
        <header
          className="sticky top-0 z-20 flex shrink-0 items-center border-b border-[var(--brand-border)] bg-[var(--brand-surface)]"
          style={{ height: HEADER_HEIGHT }}
        >
          <div
            className="flex min-w-0 flex-1 items-center overflow-hidden pl-6 pr-4"
            style={{ maxWidth: `calc(100% - ${HEADER_RIGHT_WIDTH}px)` }}
          >
            <TopModuleNav />
          </div>
          <div
            className="flex shrink-0 items-center justify-end gap-3 border-l border-[var(--brand-border)] bg-[var(--brand-surface)] pl-4 pr-4"
            style={{ width: HEADER_RIGHT_WIDTH }}
          >
            <UserButton afterSignOutUrl="/" />
          </div>
        </header>

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
