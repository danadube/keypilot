import { redirect } from "next/navigation";
import { showingHqOpenHouseWorkspaceHref } from "@/lib/showing-hq/showing-workflow-hrefs";

export default function OpenHouseDetailPage({
  params,
}: {
  params: { id: string };
}) {
  redirect(showingHqOpenHouseWorkspaceHref(params.id));
}
