import { describe, expect, it } from "vitest";
import { ORDER_STATUSES } from "@/data/demo-data";

describe("laundry order statuses", () => {
  it("keeps the complete order lifecycle in the requested sequence", () => {
    expect(ORDER_STATUSES).toEqual([
      "Created",
      "Confirmed",
      "Laundry Received",
      "Processing",
      "Quality Check",
      "Ready for Collection",
      "Out for Delivery",
      "Collected",
      "Completed",
    ]);
  });
});
