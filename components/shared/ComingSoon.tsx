"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kpBtnSecondary } from "@/components/ui/kp-dashboard-button-tiers";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Construction } from "lucide-react";

type ComingSoonProps = {
  moduleName: string;
  description?: string;
  backHref?: string;
};

export function ComingSoon({ moduleName, description, backHref = "/" }: ComingSoonProps) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-8">
      <Card className="max-w-md">
        <CardHeader>
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Construction className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle>{moduleName}</CardTitle>
          <CardDescription>
            {description ?? "This module is coming soon."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className={cn(kpBtnSecondary)}>
            <Link href={backHref}>← Back to platform</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
