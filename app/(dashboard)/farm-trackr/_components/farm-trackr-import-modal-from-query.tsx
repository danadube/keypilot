"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { BrandModal } from "@/components/ui/BrandModal";
import { FarmTrackrImportWorkflow } from "./farm-trackr-import-workflow";

type Props = {
  onApplySuccess: () => void;
};

export function FarmTrackrImportModalFromQuery({ onApplySuccess }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const open = searchParams.get("import") === "open";

  const dismiss = () => {
    router.replace("/farm-trackr", { scroll: false });
  };

  return (
    <BrandModal
      open={open}
      onOpenChange={(next) => {
        if (!next) dismiss();
      }}
      title="Import contacts"
      description="CSV, Google Sheets, or Excel — map columns and apply to a farm area."
      size="2xl"
      bodyClassName="max-h-[min(88vh,840px)] overflow-y-auto overflow-x-hidden py-3"
    >
      <FarmTrackrImportWorkflow
        onApplySuccess={() => {
          onApplySuccess();
          dismiss();
        }}
      />
    </BrandModal>
  );
}
