import { OpenHouseDetail } from "@/components/open-houses/OpenHouseDetail";

export default function OpenHouseDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <OpenHouseDetail id={params.id} />;
}
