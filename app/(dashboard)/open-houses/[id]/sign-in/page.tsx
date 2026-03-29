import { OpenHouseHostConsole } from "@/components/open-houses/OpenHouseHostConsole";

export default function OpenHouseHostConsolePage({
  params,
}: {
  params: { id: string };
}) {
  return <OpenHouseHostConsole openHouseId={params.id} />;
}
