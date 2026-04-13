import { NewShowingForm } from "@/components/showing-hq/NewShowingForm";

export default function NewShowingPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const sd = searchParams.scheduledDate;
  const st = searchParams.scheduledTime;
  return (
    <NewShowingForm
      initialScheduledDate={typeof sd === "string" ? sd : undefined}
      initialScheduledTime={typeof st === "string" ? st : undefined}
    />
  );
}
