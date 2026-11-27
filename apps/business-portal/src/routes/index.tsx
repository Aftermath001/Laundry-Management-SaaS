import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { pageMetadata } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: pageMetadata(
      "Overview",
      "Track revenue, orders, and branch performance across your laundry business.",
    ),
  }),
  component: DashboardPage,
});
