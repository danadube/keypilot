import { ShowingsListView } from "@/components/modules/showing-hq/showings-list-view";

type PageProps = {
  searchParams: { openShowing?: string | string[] };
};

export default function ShowingsPage({ searchParams }: PageProps) {
  const raw = searchParams.openShowing;
  const openShowing =
    typeof raw === "string" ? raw.trim() || undefined : Array.isArray(raw) ? raw[0]?.trim() || undefined : undefined;

  return <ShowingsListView initialOpenShowingId={openShowing} />;
}
