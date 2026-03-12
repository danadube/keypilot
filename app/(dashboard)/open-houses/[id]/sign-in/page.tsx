import { SignInDisplay } from "@/components/open-houses/SignInDisplay";

export default function OpenHouseSignInPage({
  params,
}: {
  params: { id: string };
}) {
  return <SignInDisplay openHouseId={params.id} />;
}
