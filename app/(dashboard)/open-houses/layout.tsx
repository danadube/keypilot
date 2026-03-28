import { ShowingHqWorkspaceChrome } from "@/components/modules/showing-hq/showing-hq-tabs";

export default function OpenHousesWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ShowingHqWorkspaceChrome>{children}</ShowingHqWorkspaceChrome>;
}
