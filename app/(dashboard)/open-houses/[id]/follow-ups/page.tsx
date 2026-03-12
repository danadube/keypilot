import { FollowUpsList } from "@/components/open-houses/FollowUpsList";

export default function FollowUpsPage({
  params,
}: {
  params: { id: string };
}) {
  return <FollowUpsList openHouseId={params.id} />;
}
