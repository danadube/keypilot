export default function OpenHouseDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div>
      <h1>Open House</h1>
      {/* TODO: implement */}
      <p>Open House ID: {params.id}</p>
    </div>
  );
}
