import { NewShowingForm } from "@/components/showing-hq/NewShowingForm";

export default function NewShowingPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const sd = searchParams.scheduledDate;
  const st = searchParams.scheduledTime;
  const pid = searchParams.propertyId;
  return (
    <NewShowingForm
      initialScheduledDate={typeof sd === "string" ? sd : undefined}
      initialScheduledTime={typeof st === "string" ? st : undefined}
      initialPropertyId={typeof pid === "string" ? pid : undefined}
    />
  );
}
