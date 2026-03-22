// Phase 1 migration: new dark premium UI layer is now active.
// The previous component (OpenHousesList) is preserved at
// components/open-houses/OpenHousesList.tsx — revert by swapping the import.
import { OpenHousesListView } from "@/components/modules/open-houses/open-houses-list-view";

export default function OpenHousesPage() {
  return <OpenHousesListView />;
}
