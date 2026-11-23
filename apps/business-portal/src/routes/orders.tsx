import { createFileRoute } from "@tanstack/react-router";
import { OrdersPage } from "@/components/orders/orders-page";
import { pageMetadata } from "@/lib/seo";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: pageMetadata("Orders", "Create and track LaundryFlow orders across your laundry branches."),
  }),
  component: OrdersPage,
});