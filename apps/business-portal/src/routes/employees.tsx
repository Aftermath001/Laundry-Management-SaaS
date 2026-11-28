import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Check,
  ChevronDown,
  MailPlus,
  MoreHorizontal,
  Search,
  ShieldCheck,
  UserRoundPlus,
  UsersRound,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AvatarInitials, EmptyState, PageHeading } from "@/components/shared";
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
import { DEMO_EMPLOYEES, EMPLOYEE_ROLES } from "@/data/demo-data";
import { pageMetadata } from "@/lib/seo";
import { toast } from "sonner";
import { apiClient } from "@/services/api-client";

type Employee = (typeof DEMO_EMPLOYEES)[number];

export function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>(DEMO_EMPLOYEES);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All roles");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<(typeof EMPLOYEE_ROLES)[number]>("Cashier");
  const [branch, setBranch] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const filtered = useMemo(
    () =>
      employees.filter((employee) => {
        const matchesQuery = `${employee.name} ${employee.email} ${employee.branch}`
          .toLowerCase()
          .includes(query.toLowerCase());
        return matchesQuery && (roleFilter === "All roles" || employee.role === roleFilter);
      }),
    [employees, query, roleFilter],
  );
  const activeCount = employees.filter((employee) => employee.status === "Active").length;

  useEffect(() => {
    let active = true;
    async function loadInvitationContext() {
      try {
        const response = await apiClient.get<{ businesses: { id: string }[] }>("/v1/businesses");
        const currentBusiness = response.businesses?.[0];
        if (!currentBusiness || !active) return;
        setBusinessId(currentBusiness.id);
        const branchResponse = await apiClient.get<{ branches: { id: string; name: string }[] }>(
          `/v1/businesses/${currentBusiness.id}/branches`,
        );
        if (active) setBranches(branchResponse.branches ?? []);
      } catch (error) {
        if (active)
          toast.error(
            error instanceof Error ? error.message : "Unable to load invitation details.",
          );
      }
    }
    void loadInvitationContext();
    return () => {
      active = false;
    };
  }, []);

  async function inviteEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!businessId || !name.trim() || !email.trim()) {
      toast.error("Complete the invitation details first.");
      return;
    }
    const apiRole =
      role === "Business Administrator" ? "admin" : role === "Branch Manager" ? "manager" : "staff";
    if (apiRole !== "admin" && !branch) {
      toast.error("Select a branch for this team member.");
      return;
    }
    setSaving(true);
    try {
      const result = await apiClient.post<{
        invitation_url?: string;
        invitation_token?: string;
        message: string;
      }>(`/v1/businesses/${businessId}/invitations`, {
        email: email.trim(),
        role: apiRole,
        branch_id: apiRole === "admin" ? null : branch,
      });
      const inviteUrl = result.invitation_url;
      if (inviteUrl) {
        try {
          await navigator.clipboard.writeText(inviteUrl);
          toast.success("Invitation link created and copied. Send it to the team member.");
        } catch {
          window.prompt("Copy this invitation link and send it to the team member:", inviteUrl);
        }
      } else {
        toast.success(result.message);
      }
      setName("");
      setEmail("");
      setBranch("");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create invitation.");
    } finally {
      setSaving(false);
    }
  }

  function toggleEmployee(employee: Employee) {
    const nextStatus = employee.status === "Inactive" ? "Active" : "Inactive";
    setEmployees((current) =>
      current.map((item) => (item.id === employee.id ? { ...item, status: nextStatus } : item)),
    );
    toast.success(`${employee.name} marked ${nextStatus.toLowerCase()} in the demo.`);
  }

  return (
    <AppShell>
      <PageHeading
        eyebrow="People & access"
        title="Team members"
        description="Invite staff, assign branch roles, and manage access across your business."
        action={
          <Button className="h-9" onClick={() => setOpen(true)}>
            <UserRoundPlus className="size-4" />
            Invite member
          </Button>
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
          <span className="grid size-9 place-items-center rounded-md bg-secondary text-primary">
            <UsersRound className="size-4" />
          </span>
          <div>
            <p className="text-xl font-semibold">{employees.length}</p>
            <p className="text-[11px] text-muted-foreground">Team members</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
          <span className="grid size-9 place-items-center rounded-md bg-success/10 text-success">
            <Check className="size-4" />
          </span>
          <div>
            <p className="text-xl font-semibold">{activeCount}</p>
            <p className="text-[11px] text-muted-foreground">Active members</p>
          </div>
        </div>
        <div className="col-span-2 flex items-center gap-3 rounded-lg border border-border bg-card p-4 sm:col-span-1">
          <span className="grid size-9 place-items-center rounded-md bg-chart-3/15 text-warning">
            <MailPlus className="size-4" />
          </span>
          <div>
            <p className="text-xl font-semibold">
              {employees.filter((employee) => employee.status === "Invited").length}
            </p>
            <p className="text-[11px] text-muted-foreground">Invitations pending</p>
          </div>
        </div>
      </div>
      <section className="rounded-lg border border-border bg-card shadow-[0_1px_2px_0_var(--color-border)]">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="text-sm font-semibold">All team members</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Manage roles and branch assignments
            </p>
          </div>
          <div className="flex flex-col gap-2 min-[480px]:flex-row">
            <label className="relative flex-1 min-[480px]:w-56">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search team members"
                placeholder="Search team"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-9 pl-9 text-xs"
              />
            </label>
            <label className="relative">
              <select
                aria-label="Filter by employee role"
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                className="h-9 w-full appearance-none rounded-md border border-input bg-background pl-3 pr-8 text-xs outline-none focus:ring-2 focus:ring-ring min-[480px]:w-48"
              >
                <option>All roles</option>
                {EMPLOYEE_ROLES.filter((employeeRole) => employeeRole !== "Business Owner").map(
                  (employeeRole) => (
                    <option key={employeeRole}>{employeeRole}</option>
                  ),
                )}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            </label>
          </div>
        </div>
        {filtered.length === 0 ? (
          <EmptyState
            title="No team members found"
            message="Try another name, email, branch, or role."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] text-left">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3">Team member</th>
                  <th className="px-3 py-3">Role</th>
                  <th className="px-3 py-3">Branch</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Manage</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((employee) => (
                  <tr
                    key={employee.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <AvatarInitials name={employee.name} initials={employee.initials} />
                        <div>
                          <p className="text-xs font-semibold">{employee.name}</p>
                          <p className="mt-1 text-[10px] text-muted-foreground">{employee.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <ShieldCheck className="size-3.5 text-primary" />
                        {employee.role}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-xs text-muted-foreground">
                      {employee.branch}
                    </td>
                    <td className="px-3 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${employee.status === "Active" ? "text-success" : employee.status === "Invited" ? "text-warning" : "text-muted-foreground"}`}
                      >
                        <span
                          className={`size-1.5 rounded-full ${employee.status === "Active" ? "bg-success" : employee.status === "Invited" ? "bg-warning" : "bg-muted-foreground"}`}
                        />
                        {employee.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={employee.status === "Invited"}
                          onClick={() => toggleEmployee(employee)}
                        >
                          {employee.status === "Inactive" ? "Activate" : "Deactivate"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`More actions for ${employee.name}`}
                          onClick={() =>
                            toast.success(
                              `${employee.name} · ${employee.role} · ${employee.branch}`,
                            )
                          }
                          className="size-8 text-muted-foreground"
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="border-t border-border px-5 py-3 text-[11px] text-muted-foreground">
          Showing {filtered.length} of {employees.length} team members
        </div>
      </section>
      <div className="mt-5 flex items-center gap-3 rounded-lg border border-border bg-card p-4">
        <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
          <ShieldCheck className="size-4" />
        </span>
        <div>
          <p className="text-xs font-semibold">Role-based access</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Roles control what your team can see and manage. Permissions are ready for your
            connected service.
          </p>
        </div>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite a team member</DialogTitle>
            <DialogDescription>
              Create a secure invitation link. The recipient must register using the invited email
              address.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={inviteEmployee} className="space-y-4">
            <label className="block space-y-1.5 text-xs font-medium">
              Full name
              <Input
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Grace Njeri"
              />
            </label>
            <label className="block space-y-1.5 text-xs font-medium">
              Email address
              <Input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@business.com"
              />
            </label>
            <label className="block space-y-1.5 text-xs font-medium">
              Role
              <select
                value={role}
                onChange={(event) => setRole(event.target.value as (typeof EMPLOYEE_ROLES)[number])}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                {EMPLOYEE_ROLES.filter((employeeRole) => employeeRole !== "Business Owner").map(
                  (employeeRole) => (
                    <option key={employeeRole}>{employeeRole}</option>
                  ),
                )}
              </select>
            </label>
            {role !== "Business Administrator" && (
              <label className="block space-y-1.5 text-xs font-medium">
                Branch
                <select
                  required
                  value={branch}
                  onChange={(event) => setBranch(event.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select a branch</option>
                  {branches.map((branchOption) => (
                    <option key={branchOption.id} value={branchOption.id}>
                      {branchOption.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !businessId}>
                <MailPlus className="size-4" />
                {saving ? "Creating invitation…" : "Create invitation link"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

export const Route = createFileRoute("/employees")({
  head: () => ({
    meta: pageMetadata(
      "Team members",
      "Invite LaundryFlow staff, assign roles, and manage branch access.",
    ),
  }),
  component: EmployeesPage,
});
