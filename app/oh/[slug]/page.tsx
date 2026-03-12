import { VisitorSignInForm } from "@/components/oh/VisitorSignInForm";

export default function PublicSignInPage({
  params,
}: {
  params: { slug: string };
}) {
  return <VisitorSignInForm slug={params.slug} />;
}
