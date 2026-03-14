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

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header: grid-aligned with sidebar — brand (240px) | module nav | global controls */}
      <header
        className="sticky top-0 z-20 flex shrink-0 items-center border-b border-[var(--brand-border)] bg-[var(--brand-surface)]"
        style={{ height: HEADER_HEIGHT }}
      >
        {/* Left: KeyPilot brand area — same width as sidebar, platform anchor */}
        <div
          className="flex shrink-0 items-center border-r border-[var(--brand-border)] px-6"
          style={{ width: SIDEBAR_WIDTH }}
        >
          <Link
            href="/"
            className="flex items-center transition-opacity hover:opacity-90"
          >
            <Image
              src="/KeyPilot-logo.png?v=4"
              alt="KeyPilot - The Real Estate Operations Platform"
              width={160}
              height={48}
              className="h-10 w-auto object-contain"
              priority
            />
          </Link>
        </div>

        {/* Middle: Module navigation — separation from brand anchor */}
        <div className="flex min-w-0 flex-1 items-center pl-14 pr-6">
          <TopModuleNav />
        </div>

        {/* Right: Global controls */}
        <div className="flex shrink-0 items-center gap-3 pr-4">
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      {/* Main area: Sidebar (240px) + Content */}
      <div className="flex min-h-0 flex-1">
        <ModuleSidebar />
        <main className="min-h-0 flex-1 overflow-auto bg-[var(--brand-bg)] p-8 md:p-10">
          <ProductTierProvider>
            <div className="mx-auto min-h-[50vh]" style={{ maxWidth: 1280 }}>
              {children}
            </div>
          </ProductTierProvider>
        </main>
      </div>
    </div>
  );
}
