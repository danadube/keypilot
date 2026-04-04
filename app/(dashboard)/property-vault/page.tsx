import { redirect } from "next/navigation";

/** Bookmarks and legacy links: default PropertyVault entry is the properties list. */
export default function PropertyVaultRootPage() {
  redirect("/properties");
}
