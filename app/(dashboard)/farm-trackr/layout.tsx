import { FarmTrackrWorkspaceChrome } from "@/components/modules/farm-trackr/farm-trackr-workspace-chrome";

export default function FarmTrackrLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <FarmTrackrWorkspaceChrome>{children}</FarmTrackrWorkspaceChrome>;
}
