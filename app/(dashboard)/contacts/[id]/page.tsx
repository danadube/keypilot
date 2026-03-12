export default function ContactDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div>
      <h1>Contact</h1>
      {/* TODO: implement */}
      <p>Contact ID: {params.id}</p>
    </div>
  );
}
