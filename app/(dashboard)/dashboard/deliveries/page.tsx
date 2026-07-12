import { redirect } from "next/navigation";

/** Courier jobs now live under Orders (channel=courier). */
export default function DeliveriesPage() {
  redirect("/dashboard/orders?channel=courier");
}
