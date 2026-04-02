"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { kpBtnPrimary, kpBtnTertiary } from "@/components/ui/kp-dashboard-button-tiers";
import { MapPinned } from "lucide-react";
import { ContactDetailSection } from "./contact-detail-section";
import type { FarmAreaOption, FarmMembership } from "./contact-detail-types";

type ContactFarmMembershipsPanelProps = {
  memberships: FarmMembership[];
  farmAreas: FarmAreaOption[];
  selectedFarmAreaId: string;
  addingFarmMembership: boolean;
  farmMembershipError: string | null;
  onSelectedFarmAreaIdChange: (v: string) => void;
  onAddFarmMembership: () => void;
  onArchiveFarmMembership: (membershipId: string) => void;
};

export function ContactFarmMembershipsPanel({
  memberships,
  farmAreas,
  selectedFarmAreaId,
  addingFarmMembership,
  farmMembershipError,
  onSelectedFarmAreaIdChange,
  onAddFarmMembership,
  onArchiveFarmMembership,
}: ContactFarmMembershipsPanelProps) {
  return (
    <ContactDetailSection
      title="Farm memberships"
      description="Assign this contact to a farm area for segmentation."
      icon={<MapPinned className="h-3.5 w-3.5" />}
    >
      {farmMembershipError ? (
        <p className="mb-3 text-xs text-red-400">{farmMembershipError}</p>
      ) : null}

      {memberships.length > 0 ? (
        <ul className="mb-3 space-y-2">
          {memberships.map((membership) => (
            <li
              key={membership.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-kp-outline bg-kp-surface-high px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-kp-on-surface">
                  {membership.farmArea.name}
                </p>
                <p className="truncate text-xs text-kp-on-surface-variant">
                  {membership.farmArea.territory.name}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn(kpBtnTertiary, "h-7 px-2 text-xs")}
                onClick={() => onArchiveFarmMembership(membership.id)}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-3 text-xs text-kp-on-surface-variant">
          No farm memberships yet.
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Select
          value={selectedFarmAreaId}
          onValueChange={onSelectedFarmAreaIdChange}
        >
          <SelectTrigger className="h-8 border-kp-outline bg-kp-surface-high text-sm text-kp-on-surface">
            <SelectValue
              placeholder={
                farmAreas.length > 0
                  ? "Select farm area..."
                  : "No farm areas available"
              }
            />
          </SelectTrigger>
          <SelectContent className="border-kp-outline bg-kp-surface text-kp-on-surface">
            {farmAreas.map((area) => (
              <SelectItem key={area.id} value={area.id}>
                {area.territory.name} - {area.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(kpBtnPrimary, "h-8 border-transparent px-3 text-xs")}
          onClick={onAddFarmMembership}
          disabled={!selectedFarmAreaId || addingFarmMembership}
        >
          {addingFarmMembership ? "Adding..." : "Add to farm area"}
        </Button>
      </div>
    </ContactDetailSection>
  );
}
