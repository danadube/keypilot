/**
 * Public open house sign-in layout.
 * No dashboard shell, sidebar, or admin navigation — visitors see only the sign-in page.
 */
export default function OhLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
