import { redirect } from "next/navigation";

/** Canonical open-house list lives at `/open-houses`; links use this path for ShowingHQ context. */
export default function ShowingHQOpenHousesIndexRedirectPage() {
  redirect("/open-houses");
}
