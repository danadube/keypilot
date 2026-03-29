import { SignInDisplay } from "@/components/open-houses/SignInDisplay";

export default function OpenHouseTabletSignInPage({
  params,
}: {
  params: { id: string };
}) {
  return <SignInDisplay openHouseId={params.id} />;
}
