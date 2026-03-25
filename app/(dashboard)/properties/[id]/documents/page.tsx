import { PropertyDocumentsView } from "@/components/modules/properties/property-documents-view";

export default function PropertyDocumentsPage({
  params,
}: {
  params: { id: string };
}) {
  return <PropertyDocumentsView id={params.id} />;
}
