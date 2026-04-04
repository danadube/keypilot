import { PropertyVaultWorkspaceChrome } from "@/components/modules/properties/property-vault-workspace-chrome";

export default function PropertiesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PropertyVaultWorkspaceChrome>{children}</PropertyVaultWorkspaceChrome>;
}
