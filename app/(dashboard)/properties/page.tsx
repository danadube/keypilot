// Phase 1 migration: new dark premium UI layer is now active.
// The previous component (PropertiesList) is preserved at
// components/properties/PropertiesList.tsx — revert by swapping the import.
import { PropertiesListView } from "@/components/modules/properties/properties-list-view";

export default function PropertiesPage() {
  return <PropertiesListView />;
}
