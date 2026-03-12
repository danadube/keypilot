import { PropertyDetail } from "@/components/properties/PropertyDetail";

export default function PropertyDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <PropertyDetail id={params.id} />;
}
