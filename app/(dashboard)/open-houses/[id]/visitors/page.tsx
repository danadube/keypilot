import { VisitorsList } from "@/components/open-houses/VisitorsList";

export default function VisitorsPage({
  params,
}: {
  params: { id: string };
}) {
  return <VisitorsList openHouseId={params.id} />;
}
