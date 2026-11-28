import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, PackageCheck, Plus, Search, ToggleLeft, ToggleRight } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { EmptyState, PageHeading } from "@/components/shared";
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
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/services/api-client";
import { pageMetadata } from "@/lib/seo";
import { toast } from "sonner";

type Business = {
  id: string;
  name: string;
};

type ServiceUnit = "item" | "kg" | "load" | "pair";

type Service = {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  unit: ServiceUnit;
  unit_price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type ServicesResponse = {
  success: boolean;
  services: Service[];
};

type ServiceResponse = {
  success: boolean;
  message: string;
  service: Service;
};

type BusinessResponse = {
  success: boolean;
  businesses: Business[];
};

type ServiceForm = {
  name: string;
  description: string;
  unit: ServiceUnit;
  unit_price: string;
};

const emptyForm: ServiceForm = {
  name: "",
  description: "",
  unit: "item",
  unit_price: "",
};

const currency = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 2,
});

const unitLabels: Record<ServiceUnit, string> = {
  item: "per item",
  kg: "per kg",
  load: "per load",
  pair: "per pair",
};

export function ServicesPage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState<ServiceForm>(emptyForm);

  async function loadServices() {
    setLoading(true);
    try {
      const businessResponse = await apiClient.get<BusinessResponse>("/v1/businesses");
      const currentBusiness = businessResponse.businesses?.[0];

      if (!currentBusiness) {
        setBusiness(null);
        setServices([]);
        return;
      }

      setBusiness(currentBusiness);
      const response = await apiClient.get<ServicesResponse>(
        `/v1/businesses/${currentBusiness.id}/services`,
      );
      setServices(response.services ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load services.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadServices();
  }, []);

  const filteredServices = useMemo(
    () =>
      services.filter((service) => {
        const matchesQuery = `${service.name} ${service.description ?? ""}`
          .toLowerCase()
          .includes(query.toLowerCase());
        const matchesFilter =
          filter === "all" || (filter === "active" ? service.is_active : !service.is_active);
        return matchesQuery && matchesFilter;
      }),
    [services, query, filter],
  );

  const activeCount = services.filter((service) => service.is_active).length;

  function openCreateDialog() {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEditDialog(service: Service) {
    setEditing(service);
    setForm({
      name: service.name,
      description: service.description ?? "",
      unit: service.unit,
      unit_price: String(service.unit_price),
    });
    setDialogOpen(true);
  }

  function updateForm<K extends keyof ServiceForm>(field: K, value: ServiceForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function saveService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!business || !form.name.trim() || form.unit_price.trim() === "") return;

    const unitPrice = Number(form.unit_price);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      toast.error("Enter a valid service price.");
      return;
    }

    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      unit: form.unit,
      unit_price: unitPrice,
    };

    try {
      if (editing) {
        const response = await apiClient.patch<ServiceResponse>(
          `/v1/businesses/${business.id}/services/${editing.id}`,
          payload,
        );
        setServices((current) =>
          current.map((service) => (service.id === editing.id ? response.service : service)),
        );
        toast.success("Service updated successfully.");
      } else {
        const response = await apiClient.post<ServiceResponse>(
          `/v1/businesses/${business.id}/services`,
          payload,
        );
        setServices((current) =>
          [...current, response.service].sort((a, b) => a.name.localeCompare(b.name)),
        );
        toast.success("Service created successfully.");
      }

      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save service.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleService(service: Service) {
    if (!business) return;
    const nextActive = !service.is_active;
    if (!nextActive && !window.confirm(`Deactivate "${service.name}"? It will no longer be available for new order items.`)) {
      return;
    }

    try {
      const response = await apiClient.patch<ServiceResponse>(
        `/v1/businesses/${business.id}/services/${service.id}`,
        { is_active: nextActive },
      );
      setServices((current) =>
        current.map((item) => (item.id === service.id ? response.service : item)),
      );
      toast.success(nextActive ? "Service activated." : "Service deactivated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update service status.");
    }
  }

  return (
    <AppShell>
      <PageHeading
        eyebrow="Business pricing"
        title="Service catalogue"
        description="Manage the laundry services and prices available when creating orders."
        action={
          <Button onClick={openCreateDialog} className="h-9" disabled={!business || loading}>
            <Plus className="size-4" />
            Add service
          </Button>
        }
      />

      {business && (
        <p className="mb-4 text-xs text-muted-foreground">
          Business: <span className="font-medium text-foreground">{business.name}</span>
        </p>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total services</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{loading ? "—" : services.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Active services</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{loading ? "—" : activeCount}</p>
        </div>
        <div className="col-span-2 rounded-lg border border-border bg-card p-4 sm:col-span-1">
          <p className="text-xs text-muted-foreground">Inactive services</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{loading ? "—" : services.length - activeCount}</p>
        </div>
      </div>

      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-[0_1px_2px_0_var(--color-border)]">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="text-sm font-semibold">All services</h2>
            <p className="mt-1 text-xs text-muted-foreground">{filteredServices.length} services in this view</p>
          </div>
          <div className="flex flex-col gap-2 min-[480px]:flex-row">
            <label className="relative flex-1 min-[480px]:w-56">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search services"
                placeholder="Search services"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-9 pl-9 text-xs"
              />
            </label>
            <select
              aria-label="Filter services"
              value={filter}
              onChange={(event) => setFilter(event.target.value as typeof filter)}
              className="h-9 rounded-md border border-input bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All services</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading services...
          </div>
        ) : !business ? (
          <EmptyState title="No business found" message="Your account is not linked to an active business." />
        ) : filteredServices.length === 0 ? (
          <EmptyState
            title={services.length === 0 ? "No services yet" : "No matching services"}
            message={services.length === 0 ? "Add your first laundry service to start building your price list." : "Try another service name or filter."}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3">Service</th>
                  <th className="px-3 py-3">Billing unit</th>
                  <th className="px-3 py-3 text-right">Price</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredServices.map((service) => (
                  <tr key={service.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-md bg-secondary text-primary">
                          <PackageCheck className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold">{service.name}</p>
                          <p className="mt-1 max-w-md text-[11px] text-muted-foreground">{service.description || "No description provided"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-xs capitalize text-muted-foreground">{unitLabels[service.unit]}</td>
                    <td className="px-3 py-4 text-right text-xs font-semibold tabular-nums">{currency.format(service.unit_price)}</td>
                    <td className="px-3 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${service.is_active ? "text-success" : "text-muted-foreground"}`}>
                        <span className={`size-1.5 rounded-full ${service.is_active ? "bg-success" : "bg-muted-foreground"}`} />
                        {service.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(service)}>Edit</Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void toggleService(service)}
                          className="gap-1.5 text-muted-foreground"
                        >
                          {service.is_active ? <ToggleRight className="size-4" /> : <ToggleLeft className="size-4" />}
                          {service.is_active ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit service" : "Add a service"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update the service details and pricing." : "Add a service to your business price list."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveService} className="space-y-4">
            <label className="block space-y-1.5 text-xs font-medium">
              Service name
              <Input required minLength={2} maxLength={100} value={form.name} onChange={(event) => updateForm("name", event.target.value)} placeholder="e.g. Wash & Fold" />
            </label>
            <label className="block space-y-1.5 text-xs font-medium">
              Description
              <Textarea maxLength={500} rows={3} value={form.description} onChange={(event) => updateForm("description", event.target.value)} placeholder="Describe what this service includes" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1.5 text-xs font-medium">
                Billing unit
                <select
                  value={form.unit}
                  onChange={(event) => updateForm("unit", event.target.value as ServiceUnit)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="item">Per item</option>
                  <option value="kg">Per kg</option>
                  <option value="load">Per load</option>
                  <option value="pair">Per pair</option>
                </select>
              </label>
              <label className="block space-y-1.5 text-xs font-medium">
                Price (KES)
                <Input required min="0" step="0.01" type="number" value={form.unit_price} onChange={(event) => updateForm("unit_price", event.target.value)} placeholder="150" />
              </label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="size-4 animate-spin" />}
                {editing ? "Save changes" : "Add service"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: pageMetadata("Services", "Manage LaundryFlow service catalogue and pricing."),
  }),
  component: ServicesPage,
});
