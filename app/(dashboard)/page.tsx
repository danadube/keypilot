import { redirect } from "next/navigation";

/** App entry: operational dashboard (not ShowingHQ-first redirect). */
export default function HomeRoute() {
  redirect("/dashboard");
}
