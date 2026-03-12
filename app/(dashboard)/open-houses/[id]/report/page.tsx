export default function ReportPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div>
      <h1>Report</h1>
      {/* TODO: implement */}
      <p>Open House ID: {params.id}</p>
    </div>
  );
}
