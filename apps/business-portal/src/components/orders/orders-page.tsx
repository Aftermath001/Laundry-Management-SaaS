import { useMemo, useState, type FormEvent } from "react";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardList,
  Download,
  Eye,
  Plus,
  Printer,
  Search,
  Shirt,
  SlidersHorizontal,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AvatarInitials, EmptyState, OrderStatusBadge, PageHeading } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DEMO_ORDERS, ORDER_STATUSES, type OrderStatus, formatKES } from "@/data/demo-data";
import { toast } from "sonner";

type Order = (typeof DEMO_ORDERS)[number];

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>(DEMO_ORDERS);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All orders");
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<Order | null>(null);
  const [customer, setCustomer] = useState("");
  const [service, setService] = useState("Wash & fold · 5 kg");
  const [amount, setAmount] = useState("1500");
  const filtered = useMemo(
    () =>
      orders.filter((order) => {
        const matchesQuery = `${order.id} ${order.customer} ${order.branch}`
          .toLowerCase()
          .includes(query.toLowerCase());
        return matchesQuery && (statusFilter === "All orders" || order.status === statusFilter);
      }),
    [orders, query, statusFilter],
  );

  function createOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!customer.trim()) return;
    const initials = customer
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
    setOrders((current) => [
      {
        id: `LF-${2842 + current.length - DEMO_ORDERS.length}`,
        customer: customer.trim(),
        service,
        branch: "Westlands Studio",
        due: "Today, 5:30 PM",
        amount: Number(amount),
        status: "Created",
        initials,
      },
      ...current,
    ]);
    setCreateOpen(false);
    setCustomer("");
    toast.success("Order added to the demo list.");
  }

  function updateStatus(orderId: string, status: OrderStatus) {
    setOrders((current) =>
      current.map((order) => (order.id === orderId ? { ...order, status } : order)),
    );
    toast.success(`${orderId} updated to ${status}.`);
  }

  return (
    <AppShell>
      <PageHeading
        eyebrow="Laundry operations"
        title="Orders"
        description="Create, track, and update laundry orders across your branches."
        action={
          <>
            <Button
              variant="outline"
              className="h-9"
              onClick={() => toast.success("Order report prepared in this demo.")}
            >
              <Download className="size-4" />
              Export
            </Button>
            <Button className="h-9" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              New order
            </Button>
          </>
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "All orders", value: "1,284", icon: ClipboardList },
          { label: "In progress", value: "48", icon: Shirt },
          { label: "Ready today", value: "12", icon: Check },
          { label: "Completed", value: "326", icon: CalendarDays },
        ].map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="flex min-w-0 items-center gap-3 rounded-lg border border-border bg-card px-3.5 py-3.5 sm:px-4"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-md bg-secondary text-primary">
              <Icon className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-lg font-semibold leading-5 tabular-nums">{value}</p>
              <p className="mt-1 truncate text-[10px] text-muted-foreground sm:text-xs">{label}</p>
            </div>
          </div>
        ))}
      </div>
      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-[0_1px_2px_0_var(--color-border)]">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="text-sm font-semibold">All orders</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {filtered.length} orders in this view
            </p>
          </div>
          <div className="flex flex-col gap-2 min-[480px]:flex-row">
            <label className="relative flex-1 min-[480px]:w-56">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search orders"
                placeholder="Search order or customer"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-9 pl-9 text-xs"
              />
            </label>
            <label className="relative">
              <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <select
                aria-label="Filter by order status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-9 w-full appearance-none rounded-md border border-input bg-background pl-9 pr-8 text-xs outline-none focus:ring-2 focus:ring-ring min-[480px]:w-44"
              >
                <option>All orders</option>
                {ORDER_STATUSES.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            </label>
          </div>
        </div>
        {filtered.length === 0 ? (
          <EmptyState
            title="No matching orders"
            message="Try another customer name, order number, or status."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3">Order</th>
                  <th className="px-3 py-3">Customer</th>
                  <th className="px-3 py-3">Service</th>
                  <th className="px-3 py-3">Due</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 text-right">Amount</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30"
                  >
                    <td className="whitespace-nowrap px-5 py-3.5 text-xs font-semibold text-primary">
                      {order.id}
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <AvatarInitials
                          name={order.customer}
                          initials={order.initials}
                          className="size-8 text-[9px]"
                        />
                        <span className="whitespace-nowrap text-xs font-medium">
                          {order.customer}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-xs text-muted-foreground">
                      {order.service}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-xs text-muted-foreground">
                      {order.due}
                    </td>
                    <td className="px-3 py-3.5">
                      <label className="sr-only" htmlFor={`status-${order.id}`}>
                        Update status for {order.id}
                      </label>
                      <select
                        id={`status-${order.id}`}
                        aria-label={`Update status for ${order.id}`}
                        value={order.status}
                        onChange={(event) =>
                          updateStatus(order.id, event.target.value as OrderStatus)
                        }
                        className="max-w-[155px] cursor-pointer appearance-none bg-transparent text-xs outline-none"
                      >
                        <option value={order.status}>{order.status}</option>
                        {ORDER_STATUSES.filter((status) => status !== order.status).map(
                          (status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ),
                        )}
                      </select>
                      <div className="mt-1">
                        <OrderStatusBadge status={order.status} />
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-right text-xs font-semibold">
                      {formatKES(order.amount)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`View details for ${order.id}`}
                        onClick={() => setDetail(order)}
                        className="size-8 text-muted-foreground"
                      >
                        <Eye className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-[11px] text-muted-foreground sm:px-5">
          <span>
            Showing {filtered.length ? 1 : 0}–{filtered.length} of {filtered.length} orders
          </span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled>
              Next
            </Button>
          </div>
        </div>
      </section>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create an order</DialogTitle>
            <DialogDescription>
              Add a customer order to the Westlands Studio demo queue.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createOrder} className="space-y-4">
            <label className="block space-y-1.5 text-xs font-medium">
              Customer name
              <Input
                required
                autoFocus
                value={customer}
                onChange={(event) => setCustomer(event.target.value)}
                placeholder="e.g. Grace Wanjiku"
              />
            </label>
            <label className="block space-y-1.5 text-xs font-medium">
              Service
              <select
                value={service}
                onChange={(event) => setService(event.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option>Wash & fold · 5 kg</option>
                <option>Dry cleaning · 3 items</option>
                <option>Wash & iron · 4 kg</option>
                <option>Premium care · 2 items</option>
              </select>
            </label>
            <label className="block space-y-1.5 text-xs font-medium">
              Amount (KES)
              <Input
                required
                min="0"
                type="number"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Add order</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={detail !== null} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent>
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>Order {detail.id}</DialogTitle>
                <DialogDescription>Order details · {detail.branch}</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 rounded-md bg-muted/40 p-4 text-xs">
                <div>
                  <p className="text-muted-foreground">Customer</p>
                  <p className="mt-1 font-semibold">{detail.customer}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Service</p>
                  <p className="mt-1 font-semibold">{detail.service}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Due</p>
                  <p className="mt-1 font-semibold">{detail.due}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total</p>
                  <p className="mt-1 font-semibold">{formatKES(detail.amount)}</p>
                </div>
                <div className="col-span-2">
                  <p className="mb-1.5 text-muted-foreground">Current status</p>
                  <OrderStatusBadge status={detail.status} />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => toast.success(`Receipt for ${detail.id} is ready to print.`)}
                >
                  <Printer className="size-4" />
                  Print receipt
                </Button>
                <Button onClick={() => setDetail(null)}>Done</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
