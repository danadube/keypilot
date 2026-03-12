export default function VisitorsPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div>
      <h1>Visitors</h1>
      {/* TODO: implement */}
      <p>Open House ID: {params.id}</p>
    </div>
  );
}
