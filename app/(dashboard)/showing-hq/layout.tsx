import { ShowingHqWorkspaceChrome } from "@/components/modules/showing-hq/showing-hq-tabs";

export default function ShowingHqLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ShowingHqWorkspaceChrome>{children}</ShowingHqWorkspaceChrome>;
}
