import type { Metadata } from "next";
import { MyCommissionsView } from "@/components/modules/transactions/my-commissions-view";

export const metadata: Metadata = {
  title: "My Commissions | TransactionHQ | KeyPilot",
  description: "Commission lines assigned to you.",
};

export default function TransactionsCommissionsPage() {
  return <MyCommissionsView />;
}
