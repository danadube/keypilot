import { ClientKeepWorkspaceChrome } from "@/components/modules/client-keep/client-keep-tabs";

export default function ContactsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClientKeepWorkspaceChrome>{children}</ClientKeepWorkspaceChrome>;
}
