import { SellerReport } from "@/components/open-houses/SellerReport";

export default function ReportPage({
  params,
}: {
  params: { id: string };
}) {
  return <SellerReport openHouseId={params.id} />;
}
