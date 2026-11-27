import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  MapPin,
  MoreHorizontal,
  Plus,
  Search,
  Store,
  UsersRound,
  Trash2,
  Loader2,
} from "lucide-react";
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
import { apiClient } from "@/services/api-client";
import { pageMetadata } from "@/lib/seo";
import { toast } from "sonner";

type Business = {
  id: string;
  name: string;
};

type Branch = {
  id: string;
  business_id: string;
  name: string;
  code: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  is_main: boolean;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
};

type BusinessResponse = {
  success: boolean;
  businesses: Business[];
};

type BranchesResponse = {
  success: boolean;
  branches: Branch[];
};

type BranchResponse = {
  success: boolean;
  branch: Branch;
};

type BranchForm = {
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
};

const emptyForm: BranchForm = {
  name: "",
  code: "",
  address: "",
  phone: "",
  email: "",
};

export function BranchesPage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Branch | null>(null);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [form, setForm] = useState<BranchForm>(emptyForm);

  async function loadBranches() {
    setLoading(true);

    try {
      const businessResponse = await apiClient.get<BusinessResponse>("/v1/businesses");

      const currentBusiness = businessResponse.businesses?.[0];

      if (!currentBusiness) {
        setBusiness(null);
        setBranches([]);
        return;
      }

      setBusiness(currentBusiness);

      const branchResponse = await apiClient.get<BranchesResponse>(
        `/v1/businesses/${currentBusiness.id}/branches`,
      );

      setBranches(branchResponse.branches ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load branches.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBranches();
  }, []);

  const filtered = useMemo(
    () =>
      branches.filter((branch) =>
        `${branch.name} ${branch.address ?? ""} ${branch.code ?? ""}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [branches, query],
  );

  const activeBranches = branches.filter((branch) => branch.status === "active").length;

  function openCreateDialog() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEditDialog(branch: Branch) {
    setEditing(branch);
    setForm({
      name: branch.name,
      code: branch.code ?? "",
      address: branch.address ?? "",
      phone: branch.phone ?? "",
      email: branch.email ?? "",
    });
    setSelected(null);
    setOpen(true);
  }

  function updateForm(field: keyof BranchForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function saveBranch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!business || !form.name.trim()) return;

    setSaving(true);

    const payload = {
      name: form.name.trim(),
      code: form.code.trim() || undefined,
      address: form.address.trim() || undefined,
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
    };

    try {
      if (editing) {
        const response = await apiClient.patch<BranchResponse>(
          `/v1/businesses/${business.id}/branches/${editing.id}`,
          payload,
        );

        setBranches((current) =>
          current.map((branch) => (branch.id === editing.id ? response.branch : branch)),
        );

        toast.success("Branch updated successfully.");
      } else {
        const response = await apiClient.post<BranchResponse>(
          `/v1/businesses/${business.id}/branches`,
          payload,
        );

        setBranches((current) => [...current, response.branch]);

        toast.success("Branch created successfully.");
      }

      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save branch.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteBranch(branch: Branch) {
    if (!business) return;

    if (branch.is_main) {
      toast.error("The main branch cannot be deleted.");
      return;
    }

    const confirmed = window.confirm(`Delete "${branch.name}"? This action cannot be undone.`);

    if (!confirmed) return;

    try {
      await apiClient.delete(`/v1/businesses/${business.id}/branches/${branch.id}`);

      setBranches((current) => current.filter((item) => item.id !== branch.id));

      setSelected(null);
      toast.success("Branch deleted successfully.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete branch.");
    }
  }

  return (
    <AppShell>
      <PageHeading
        eyebrow="Business locations"
        title="Branches"
        description="Manage locations and branch settings."
        action={
          <Button onClick={openCreateDialog} className="h-9" disabled={!business || loading}>
            <Plus className="size-4" />
            Add branch
          </Button>
        }
      />

      {business && (
        <p className="mb-4 text-xs text-muted-foreground">
          Business: <span className="font-medium">{business.name}</span>
        </p>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total branches</p>
          <p className="mt-2 text-2xl font-semibold">{loading ? "—" : branches.length}</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Active branches</p>
          <p className="mt-2 text-2xl font-semibold">{loading ? "—" : activeBranches}</p>
        </div>

        <div className="col-span-2 rounded-lg border border-border bg-card p-4 sm:col-span-1">
          <p className="text-xs text-muted-foreground">Monthly revenue</p>
          <p className="mt-2 text-2xl font-semibold">—</p>
          <p className="mt-1 text-xs text-muted-foreground">Not yet connected</p>
        </div>
      </div>

      <section className="rounded-lg border border-border bg-card shadow-[0_1px_2px_0_var(--color-border)]">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="text-sm font-semibold">All locations</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {filtered.length} business locations
            </p>
          </div>

          <label className="relative sm:w-64">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search branches"
              placeholder="Search branches"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-9 pl-9 text-xs"
            />
          </label>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading branches...
          </div>
        ) : !business ? (
          <EmptyState
            title="No business found"
            message="Your account is not linked to an active business."
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No branches found"
            message={
              query ? "Try another branch name or code." : "Add your first business location."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3">Branch</th>
                  <th className="px-3 py-3">Code</th>
                  <th className="px-3 py-3 text-right">Orders</th>
                  <th className="px-3 py-3 text-right">Revenue</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Details</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((branch) => (
                  <tr
                    key={branch.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-md bg-secondary text-primary">
                          <Store className="size-4" />
                        </span>

                        <div>
                          <p className="text-xs font-semibold">{branch.name}</p>

                          <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                            <MapPin className="size-3" />
                            {branch.address || "No address provided"}
                          </p>

                          {branch.is_main && (
                            <span className="mt-1 inline-flex text-[10px] font-medium text-primary">
                              Main branch
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-4 text-xs text-muted-foreground">
                      {branch.code || "—"}
                    </td>

                    <td className="px-3 py-4 text-right text-xs text-muted-foreground">—</td>

                    <td className="px-3 py-4 text-right text-xs text-muted-foreground">—</td>

                    <td className="px-3 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${
                          branch.status === "active" ? "text-success" : "text-warning"
                        }`}
                      >
                        <span
                          className={`size-1.5 rounded-full ${
                            branch.status === "active" ? "bg-success" : "bg-warning"
                          }`}
                        />
                        {branch.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`View ${branch.name} details`}
                        onClick={() => setSelected(branch)}
                        className="size-8 text-muted-foreground"
                      >
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit branch" : "Add a branch"}</DialogTitle>

            <DialogDescription>
              {editing ? "Update the branch details." : "Create a new business location."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={saveBranch} className="space-y-4">
            <label className="block space-y-1.5 text-xs font-medium">
              Branch name
              <Input
                required
                value={form.name}
                onChange={(event) => updateForm("name", event.target.value)}
                placeholder="e.g. Lavington Studio"
              />
            </label>

            <label className="block space-y-1.5 text-xs font-medium">
              Branch code
              <Input
                value={form.code}
                onChange={(event) => updateForm("code", event.target.value)}
                placeholder="e.g. LVG-001"
              />
            </label>

            <label className="block space-y-1.5 text-xs font-medium">
              Location / address
              <Input
                value={form.address}
                onChange={(event) => updateForm("address", event.target.value)}
                placeholder="Neighborhood, city"
              />
            </label>

            <label className="block space-y-1.5 text-xs font-medium">
              Phone
              <Input
                value={form.phone}
                onChange={(event) => updateForm("phone", event.target.value)}
                placeholder="+254..."
              />
            </label>

            <label className="block space-y-1.5 text-xs font-medium">
              Email
              <Input
                type="email"
                value={form.email}
                onChange={(event) => updateForm("email", event.target.value)}
                placeholder="branch@example.com"
              />
            </label>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>

              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="size-4 animate-spin" />}
                {editing ? "Save changes" : "Add branch"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={selected !== null} onOpenChange={(value) => !value && setSelected(null)}>
        <DialogContent>
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.name}</DialogTitle>
                <DialogDescription>{selected.address || "No address provided"}</DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <div className="rounded-md bg-muted/50 p-3.5">
                  <p className="text-[11px] text-muted-foreground">Branch code</p>
                  <p className="mt-1.5 text-sm font-semibold">{selected.code || "Not assigned"}</p>
                </div>

                <div className="rounded-md bg-muted/50 p-3.5">
                  <p className="text-[11px] text-muted-foreground">Phone</p>
                  <p className="mt-1.5 text-sm font-semibold">{selected.phone || "Not provided"}</p>
                </div>

                <div className="rounded-md bg-muted/50 p-3.5">
                  <p className="text-[11px] text-muted-foreground">Email</p>
                  <p className="mt-1.5 text-sm font-semibold">{selected.email || "Not provided"}</p>
                </div>

                <div className="flex items-center gap-2 border-t border-border pt-3 text-xs">
                  <UsersRound className="size-4 text-primary" />
                  <span className="text-muted-foreground">Manager</span>
                  <strong className="ml-auto">Not assigned</strong>
                </div>

                {selected.is_main && (
                  <p className="rounded-md border border-border p-3 text-xs text-muted-foreground">
                    This is the main branch. It cannot be deleted.
                  </p>
                )}
              </div>

              <DialogFooter className="flex-wrap sm:justify-between">
                {!selected.is_main && (
                  <Button variant="destructive" onClick={() => void deleteBranch(selected)}>
                    <Trash2 className="size-4" />
                    Delete
                  </Button>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => openEditDialog(selected)}>
                    Edit branch
                  </Button>

                  <Button onClick={() => setSelected(null)}>
                    Done <ArrowRight className="size-4" />
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

export const Route = createFileRoute("/branches")({
  head: () => ({
    meta: pageMetadata("Branches", "Manage LaundryFlow locations and branch settings."),
  }),
  component: BranchesPage,
});
