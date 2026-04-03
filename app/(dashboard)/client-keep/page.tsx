import { redirect } from "next/navigation";

/** Bookmarks and legacy links: land on Contacts (default ClientKeep home). */
export default function ClientKeepRootPage() {
  redirect("/contacts");
}
