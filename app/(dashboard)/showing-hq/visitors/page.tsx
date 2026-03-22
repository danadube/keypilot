import { VisitorsListView } from "@/components/modules/showing-hq/visitors-list-view";

export default function ShowingHQVisitorsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-kp-on-surface">Visitors</h1>
        <p className="mt-1 text-sm text-kp-on-surface-variant">
          Review open house visitors, search leads, and connect sign-ins to contacts.
        </p>
      </div>
      <VisitorsListView />
    </div>
  );
}
