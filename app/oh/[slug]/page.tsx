export default function PublicSignInPage({
  params,
}: {
  params: { slug: string };
}) {
  return (
    <div>
      <h1>Open House Sign In</h1>
      {/* TODO: implement */}
      <p>Slug: {params.slug}</p>
    </div>
  );
}
