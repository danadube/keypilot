"use client";

/**
 * Dashboard landing: ShowingHQ-first users land on ShowingHQ dashboard.
 * Others see the generic platform Home.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProductTier } from "@/components/ProductTierProvider";
import { HomePage } from "@/components/home/HomePage";
import { PageLoading } from "@/components/shared/PageLoading";

export function DashboardLanding() {
  const router = useRouter();
  const { hasModuleAccess, isLoading } = useProductTier();

  useEffect(() => {
    if (isLoading) return;
    if (hasModuleAccess("showing-hq")) {
      router.replace("/showing-hq");
    }
  }, [hasModuleAccess, isLoading, router]);

  if (isLoading) return <PageLoading message="Loading..." />;
  if (hasModuleAccess("showing-hq")) return <PageLoading message="Redirecting to ShowingHQ..." />;
  return <HomePage />;
}
