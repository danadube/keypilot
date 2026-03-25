import { PropertyMediaView } from "@/components/modules/properties/property-media-view";

export default function PropertyMediaPage({
  params,
}: {
  params: { id: string };
}) {
  return <PropertyMediaView id={params.id} />;
}
