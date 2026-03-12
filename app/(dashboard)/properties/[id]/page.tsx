export default function PropertyDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div>
      <h1>Property</h1>
      {/* TODO: implement */}
      <p>Property ID: {params.id}</p>
    </div>
  );
}
