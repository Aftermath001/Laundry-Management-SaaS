import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  CalendarDays, Check, ChevronDown, ClipboardList, Download, Eye, Loader2,
  Plus, Printer, Search, Shirt, SlidersHorizontal,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AvatarInitials, EmptyState, OrderStatusBadge, PageHeading } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/services/api-client";
import { formatKES } from "@/data/demo-data";
import { toast } from "sonner";

type ApiStatus = "pending" | "processing" | "ready" | "collected" | "delivered" | "cancelled";
type Business = { id: string; name: string };
type Branch = { id: string; name: string; status: "active" | "inactive" };
type Service = {
  id: string; name: string; unit: "item" | "kg" | "load" | "pair";
  unit_price: number; is_active: boolean;
};
type OrderItem = {
  id: string; service_id: string; service_name: string; unit: string;
  quantity: number; unit_price: number; line_total: number;
};
type Order = {
  id: string; order_number: string; business_id: string; branch_id: string;
  customer_name: string; customer_phone: string; status: ApiStatus;
  total_amount: number; due_at: string | null; notes: string | null;
  created_at: string; items: OrderItem[];
};
type BusinessResponse = { businesses: Business[] };
type BranchesResponse = { branches: Branch[] };
type ServicesResponse = { services: Service[] };
type OrdersResponse = {
  orders: Order[];
  pagination: { page: number; limit: number; total_records: number; total_pages: number };
};
type OrderResponse = { order: Order };

const statusOptions: { value: ApiStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "ready", label: "Ready for collection" },
  { value: "collected", label: "Collected" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const statusLabel = (status: ApiStatus): "Pending" | "Processing" | "Ready for collection" | "Collected" | "Delivered" | "Cancelled" =>
  statusOptions.find((item) => item.value === status)?.label ?? status;

const dateTime = (value: string | null) => {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not set"
    : new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short" }).format(date);
};

const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");

export function OrdersPage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<Order | null>(null);
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [branchId, setBranchId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [dueAt, setDueAt] = useState("");
  const [notes, setNotes] = useState("");

  async function loadOrders() {
    setLoading(true);
    try {
      const businessResponse = await apiClient.get<BusinessResponse>("/v1/businesses");
      const currentBusiness = businessResponse.businesses?.[0];
      if (!currentBusiness) {
        setBusiness(null);
        setBranches([]);
        setServices([]);
        setOrders([]);
        return;
      }
      setBusiness(currentBusiness);
      const [branchResponse, serviceResponse, orderResponse] = await Promise.all([
        apiClient.get<BranchesResponse>(`/v1/businesses/${currentBusiness.id}/branches`),
        apiClient.get<ServicesResponse>(`/v1/businesses/${currentBusiness.id}/services`),
        apiClient.get<OrdersResponse>(`/v1/businesses/${currentBusiness.id}/orders?page=1&limit=100`),
      ]);
      const activeBranches = (branchResponse.branches ?? []).filter((branch) => branch.status === "active");
      const activeServices = (serviceResponse.services ?? []).filter((service) => service.is_active);
      setBranches(activeBranches);
      setServices(activeServices);
      setOrders(orderResponse.orders ?? []);
      setBranchId((current) => current || activeBranches[0]?.id || "");
      setServiceId((current) => current || activeServices[0]?.id || "");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load orders.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadOrders(); }, []);

  const filtered = useMemo(() => orders.filter((order) => {
    const branchName = branches.find((branch) => branch.id === order.branch_id)?.name ?? "";
    const matchesQuery = `${order.order_number} ${order.customer_name} ${order.customer_phone} ${branchName}`
      .toLowerCase().includes(query.toLowerCase());
    return matchesQuery &&
      (statusFilter === "all" || order.status === statusFilter) &&
      (branchFilter === "all" || order.branch_id === branchFilter);
  }), [orders, branches, query, statusFilter, branchFilter]);

  const activeCount = orders.filter((order) => !["collected", "delivered", "cancelled"].includes(order.status)).length;
  const readyCount = orders.filter((order) => order.status === "ready").length;
  const completedCount = orders.filter((order) => ["collected", "delivered"].includes(order.status)).length;
  const selectedService = services.find((service) => service.id === serviceId);
  const calculatedTotal = selectedService ? Number(quantity || 0) * selectedService.unit_price : 0;

  function resetForm() {
    setCustomer("");
    setPhone("");
    setQuantity("1");
    setDueAt("");
    setNotes("");
    setBranchId(branches[0]?.id ?? "");
    setServiceId(services[0]?.id ?? "");
  }

  async function createOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!business || !branchId || !serviceId) {
      toast.error("Select an active branch and service.");
      return;
    }
    const parsedQuantity = Number(quantity);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0 || parsedQuantity > 100000 ||
      !Number.isInteger(parsedQuantity * 100)) {
      toast.error("Enter a valid quantity with up to two decimal places.");
      return;
    }
    setSaving(true);
    try {
      const response = await apiClient.post<OrderResponse>(`/v1/businesses/${business.id}/orders`, {
        branch_id: branchId,
        customer_name: customer.trim(),
        customer_phone: phone.trim(),
        due_at: dueAt ? new Date(dueAt).toISOString() : null,
        notes: notes.trim() || null,
        items: [{ service_id: serviceId, quantity: parsedQuantity }],
      });
      setOrders((current) => [response.order, ...current]);
      setCreateOpen(false);
      resetForm();
      toast.success(`Order ${response.order.order_number} created.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create order.");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(order: Order, status: ApiStatus) {
    if (!business || status === order.status) return;
    setUpdatingOrderId(order.id);
    try {
      const response = await apiClient.patch<OrderResponse>(
        `/v1/businesses/${business.id}/orders/${order.id}/status`,
        { status },
      );
      setOrders((current) => current.map((item) => item.id === order.id ? { ...item, ...response.order, items: item.items } : item));
      setDetail((current) => current?.id === order.id ? { ...current, ...response.order, items: current.items } : current);
      toast.success(`${order.order_number} updated to ${statusLabel(status)}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update order status.");
    } finally {
      setUpdatingOrderId(null);
    }
  }

  function exportOrders() {
    const headers = ["Order number", "Customer", "Phone", "Branch", "Status", "Total (KES)", "Created at"];
    const rows = filtered.map((order) => [
      order.order_number, order.customer_name, order.customer_phone,
      branches.find((branch) => branch.id === order.branch_id)?.name ?? "",
      statusLabel(order.status), String(order.total_amount), order.created_at,
    ]);
    const csv = [headers, ...rows].map((row) => row.map((value) =>
      `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "laundryflow-orders.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell>
      <PageHeading
        eyebrow="Laundry operations"
        title="Orders"
        description="Create, track, and update laundry orders across your branches."
        action={
          <>
            <Button variant="outline" className="h-9" onClick={exportOrders} disabled={loading || filtered.length === 0}>
              <Download className="size-4" /> Export
            </Button>
            <Button className="h-9" onClick={() => setCreateOpen(true)} disabled={!business || loading || branches.length === 0 || services.length === 0}>
              <Plus className="size-4" /> New order
            </Button>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Orders loaded", value: orders.length, icon: ClipboardList },
          { label: "In progress", value: activeCount, icon: Shirt },
          { label: "Ready", value: readyCount, icon: Check },
          { label: "Completed", value: completedCount, icon: CalendarDays },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex min-w-0 items-center gap-3 rounded-lg border border-border bg-card px-3.5 py-3.5 sm:px-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-md bg-secondary text-primary"><Icon className="size-4" /></span>
            <div className="min-w-0">
              <p className="text-lg font-semibold leading-5 tabular-nums">{loading ? "—" : value}</p>
              <p className="mt-1 truncate text-[10px] text-muted-foreground sm:text-xs">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-[0_1px_2px_0_var(--color-border)]">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="text-sm font-semibold">All orders</h2>
            <p className="mt-1 text-xs text-muted-foreground">{filtered.length} orders in this view</p>
          </div>
          <div className="flex flex-col gap-2 min-[480px]:flex-row">
            <label className="relative flex-1 min-[480px]:w-56">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input aria-label="Search orders" placeholder="Search order or customer" value={query}
                onChange={(event) => setQuery(event.target.value)} className="h-9 pl-9 text-xs" />
            </label>
            <label className="relative">
              <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <select aria-label="Filter by order status" value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-9 w-full appearance-none rounded-md border border-input bg-background pl-9 pr-8 text-xs outline-none focus:ring-2 focus:ring-ring min-[480px]:w-44">
                <option value="all">All statuses</option>
                {statusOptions.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            </label>
            <select aria-label="Filter by branch" value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-ring min-[480px]:w-44">
              <option value="all">All branches</option>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading orders...</div>
        ) : !business ? (
          <EmptyState title="No business found" message="Your account is not linked to an active business." />
        ) : filtered.length === 0 ? (
          <EmptyState title={orders.length === 0 ? "No orders yet" : "No matching orders"}
            message={orders.length === 0 ? "Create your first order using an active branch and service." : "Try another customer, order number, branch, or status."} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left">
              <thead><tr className="border-b border-border bg-muted/40 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3">Order</th><th className="px-3 py-3">Customer</th><th className="px-3 py-3">Service</th>
                <th className="px-3 py-3">Branch</th><th className="px-3 py-3">Due</th><th className="px-3 py-3">Status</th>
                <th className="px-3 py-3 text-right">Amount</th><th className="px-5 py-3 text-right">Actions</th>
              </tr></thead>
              <tbody>
                {filtered.map((order) => (
                  <tr key={order.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="whitespace-nowrap px-5 py-3.5 text-xs font-semibold text-primary">{order.order_number}</td>
                    <td className="px-3 py-3.5"><div className="flex items-center gap-2.5">
                      <AvatarInitials name={order.customer_name} initials={initials(order.customer_name)} className="size-8 text-[9px]" />
                      <div><p className="whitespace-nowrap text-xs font-medium">{order.customer_name}</p><p className="text-[10px] text-muted-foreground">{order.customer_phone}</p></div>
                    </div></td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-xs text-muted-foreground">
                      {order.items.map((item) => `${item.service_name} · ${item.quantity} ${item.unit}`).join(", ") || "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-xs text-muted-foreground">{branches.find((branch) => branch.id === order.branch_id)?.name ?? "—"}</td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-xs text-muted-foreground">{dateTime(order.due_at)}</td>
                    <td className="px-3 py-3.5">
                      <select aria-label={`Update status for ${order.order_number}`} value={order.status}
                        disabled={updatingOrderId === order.id}
                        onChange={(event) => void updateStatus(order, event.target.value as ApiStatus)}
                        className="max-w-[155px] cursor-pointer appearance-none bg-transparent text-xs outline-none disabled:opacity-50">
                        {statusOptions.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                      </select>
                      <div className="mt-1"><OrderStatusBadge status={statusLabel(order.status)} /></div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-right text-xs font-semibold">{formatKES(Number(order.total_amount))}</td>
                    <td className="px-5 py-3.5 text-right"><Button variant="ghost" size="icon" aria-label={`View details for ${order.order_number}`}
                      onClick={() => setDetail(order)} className="size-8 text-muted-foreground"><Eye className="size-4" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-[11px] text-muted-foreground sm:px-5">
          <span>Showing {filtered.length ? 1 : 0}–{filtered.length} of {orders.length} loaded orders</span>
          <span>Latest 100 orders</span>
        </div>
      </section>

      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create an order</DialogTitle>
            <DialogDescription>Choose an active branch and service. The server calculates the final price.</DialogDescription></DialogHeader>
          <form onSubmit={createOrder} className="space-y-4">
            <label className="block space-y-1.5 text-xs font-medium">Customer name
              <Input required minLength={2} maxLength={150} autoFocus value={customer} onChange={(event) => setCustomer(event.target.value)} placeholder="e.g. Grace Wanjiku" />
            </label>
            <label className="block space-y-1.5 text-xs font-medium">Customer phone
              <Input required minLength={3} maxLength={30} value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+2547..." />
            </label>
            <label className="block space-y-1.5 text-xs font-medium">Branch
              <select required value={branchId} onChange={(event) => setBranchId(event.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-[1fr_110px] gap-3">
              <label className="block space-y-1.5 text-xs font-medium">Service
                <select required value={serviceId} onChange={(event) => setServiceId(event.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                  {services.map((service) => <option key={service.id} value={service.id}>{service.name} ({formatKES(service.unit_price)}/{service.unit})</option>)}
                </select>
              </label>
              <label className="block space-y-1.5 text-xs font-medium">Quantity
                <Input required type="number" min="0.01" max="100000" step="0.01" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
              </label>
            </div>
            <div className="rounded-md bg-muted/40 px-3 py-2.5 text-xs"><div className="flex justify-between text-muted-foreground"><span>Estimated total</span><span>{selectedService ? `${formatKES(selectedService.unit_price)} × ${quantity || 0}` : "Select a service"}</span></div><p className="mt-1 text-right text-base font-semibold">{formatKES(Number.isFinite(calculatedTotal) ? calculatedTotal : 0)}</p><p className="mt-1 text-[10px] text-muted-foreground">Final amount is calculated using the current service price on the server.</p></div>
            <label className="block space-y-1.5 text-xs font-medium">Due date (optional)
              <Input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
            </label>
            <label className="block space-y-1.5 text-xs font-medium">Notes (optional)
              <Input maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Special instructions" />
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving || !branches.length || !services.length}>
                {saving && <Loader2 className="size-4 animate-spin" />} Create order
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={detail !== null} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent>
          {detail && <>
            <DialogHeader><DialogTitle>Order {detail.order_number}</DialogTitle>
              <DialogDescription>Order details · {branches.find((branch) => branch.id === detail.branch_id)?.name ?? "Branch"}</DialogDescription></DialogHeader>
            <div className="grid grid-cols-2 gap-4 rounded-md bg-muted/40 p-4 text-xs">
              <div><p className="text-muted-foreground">Customer</p><p className="mt-1 font-semibold">{detail.customer_name}</p></div>
              <div><p className="text-muted-foreground">Phone</p><p className="mt-1 font-semibold">{detail.customer_phone}</p></div>
              <div><p className="text-muted-foreground">Due</p><p className="mt-1 font-semibold">{dateTime(detail.due_at)}</p></div>
              <div><p className="text-muted-foreground">Total</p><p className="mt-1 font-semibold">{formatKES(Number(detail.total_amount))}</p></div>
              <div className="col-span-2"><p className="mb-1.5 text-muted-foreground">Items</p>
                <div className="space-y-2">{detail.items.map((item) => <div key={item.id} className="flex justify-between gap-3"><span>{item.service_name} · {item.quantity} {item.unit} × {formatKES(Number(item.unit_price))}</span><strong>{formatKES(Number(item.line_total))}</strong></div>)}</div>
              </div>
              {detail.notes && <div className="col-span-2"><p className="text-muted-foreground">Notes</p><p className="mt-1">{detail.notes}</p></div>}
              <div className="col-span-2"><p className="mb-1.5 text-muted-foreground">Current status</p><OrderStatusBadge status={statusLabel(detail.status)} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => window.print()}><Printer className="size-4" /> Print</Button>
              <Button onClick={() => setDetail(null)}>Done</Button>
            </DialogFooter>
          </>}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
