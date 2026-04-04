import { PropertyVaultWorkspaceChrome } from "@/components/modules/properties/property-vault-workspace-chrome";

export default function PropertyVaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PropertyVaultWorkspaceChrome>{children}</PropertyVaultWorkspaceChrome>;
}
