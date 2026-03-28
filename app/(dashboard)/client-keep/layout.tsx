import { ClientKeepWorkspaceChrome } from "@/components/modules/client-keep/client-keep-tabs";

export default function ClientKeepLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClientKeepWorkspaceChrome>{children}</ClientKeepWorkspaceChrome>;
}
