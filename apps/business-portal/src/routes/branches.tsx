import { useMemo, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, MapPin, MoreHorizontal, Plus, Search, Store, UsersRound } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { EmptyState, PageHeading } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DEMO_BRANCHES, formatKES } from "@/data/demo-data";
import { pageMetadata } from "@/lib/seo";
import { toast } from "sonner";

type Branch = (typeof DEMO_BRANCHES)[number];

export function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>(DEMO_BRANCHES);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Branch | null>(null);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [manager, setManager] = useState("");
  const filtered = useMemo(() => branches.filter((branch) => `${branch.name} ${branch.location} ${branch.manager}`.toLowerCase().includes(query.toLowerCase())), [branches, query]);

  function saveBranch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !location.trim()) return;
    const branch = { id: `BR-${String(branches.length + 1).padStart(3, "0")}`, name: name.trim(), location: location.trim(), manager: manager || "Unassigned", orders: 0, revenue: 0, status: "Open" };
    setBranches((current) => [...current, branch]);
    setOpen(false);
    setName(""); setLocation(""); setManager("");
    toast.success("Branch added to the demo workspace.");
  }

  return <AppShell>
    <PageHeading eyebrow="Business locations" title="Branches" description="Manage locations, assigned managers, and branch performance." action={<Button onClick={() => setOpen(true)} className="h-9"><Plus className="size-4" />Add branch</Button>} />
    <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3"><div className="rounded-lg border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Total branches</p><p className="mt-2 text-2xl font-semibold">{branches.length}</p></div><div className="rounded-lg border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Open today</p><p className="mt-2 text-2xl font-semibold">{branches.filter((branch) => branch.status === "Open").length}</p></div><div className="col-span-2 rounded-lg border border-border bg-card p-4 sm:col-span-1"><p className="text-xs text-muted-foreground">Combined monthly revenue</p><p className="mt-2 truncate text-2xl font-semibold">{formatKES(branches.reduce((total, branch) => total + branch.revenue, 0))}</p></div></div>
    <section className="rounded-lg border border-border bg-card shadow-[0_1px_2px_0_var(--color-border)]">
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div><h2 className="text-sm font-semibold">All locations</h2><p className="mt-1 text-xs text-muted-foreground">{filtered.length} business locations</p></div><label className="relative sm:w-64"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Search branches" placeholder="Search branches" value={query} onChange={(event) => setQuery(event.target.value)} className="h-9 pl-9 text-xs" /></label></div>
      {filtered.length === 0 ? <EmptyState title="No branches found" message="Try another location or manager name." /> : <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead><tr className="border-b border-border bg-muted/40 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"><th className="px-5 py-3">Branch</th><th className="px-3 py-3">Manager</th><th className="px-3 py-3 text-right">Orders · month</th><th className="px-3 py-3 text-right">Revenue · month</th><th className="px-3 py-3">Status</th><th className="px-5 py-3 text-right">Details</th></tr></thead><tbody>{filtered.map((branch) => <tr key={branch.id} className="border-b border-border last:border-0 hover:bg-muted/30"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-md bg-secondary text-primary"><Store className="size-4" /></span><div><p className="text-xs font-semibold">{branch.name}</p><p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground"><MapPin className="size-3" />{branch.location}</p></div></div></td><td className="px-3 py-4 text-xs text-muted-foreground">{branch.manager}</td><td className="px-3 py-4 text-right text-xs font-medium tabular-nums">{branch.orders}</td><td className="px-3 py-4 text-right text-xs font-semibold tabular-nums">{formatKES(branch.revenue)}</td><td className="px-3 py-4"><span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${branch.status === "Open" ? "text-success" : "text-warning"}`}><span className={`size-1.5 rounded-full ${branch.status === "Open" ? "bg-success" : "bg-warning"}`} />{branch.status}</span></td><td className="px-5 py-4 text-right"><Button variant="ghost" size="icon" aria-label={`View ${branch.name} performance`} onClick={() => setSelected(branch)} className="size-8 text-muted-foreground"><MoreHorizontal className="size-4" /></Button></td></tr>)}</tbody></table></div>}
    </section>

    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Add a branch</DialogTitle><DialogDescription>Add a location to the demo workspace.</DialogDescription></DialogHeader><form onSubmit={saveBranch} className="space-y-4"><label className="block space-y-1.5 text-xs font-medium">Branch name<Input required value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Lavington Studio" /></label><label className="block space-y-1.5 text-xs font-medium">Location<Input required value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Neighborhood, city" /></label><label className="block space-y-1.5 text-xs font-medium">Branch manager<select value={manager} onChange={(event) => setManager(event.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"><option value="">Choose manager later</option>{["Nia Wanjiku", "David Otieno", "Mercy Njeri", "Alex Kamau"].map((nameOption) => <option key={nameOption}>{nameOption}</option>)}</select></label><DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit">Add branch</Button></DialogFooter></form></DialogContent></Dialog>

    <Dialog open={selected !== null} onOpenChange={(value) => !value && setSelected(null)}><DialogContent>{selected && <><DialogHeader><DialogTitle>{selected.name}</DialogTitle><DialogDescription>{selected.location} · Branch performance</DialogDescription></DialogHeader><div className="grid grid-cols-2 gap-3"><div className="rounded-md bg-muted/50 p-3.5"><p className="text-[11px] text-muted-foreground">Orders this month</p><p className="mt-1.5 text-xl font-semibold">{selected.orders}</p></div><div className="rounded-md bg-muted/50 p-3.5"><p className="text-[11px] text-muted-foreground">Monthly revenue</p><p className="mt-1.5 text-xl font-semibold">{formatKES(selected.revenue)}</p></div><div className="col-span-2 flex items-center gap-2 border-t border-border pt-3 text-xs"><UsersRound className="size-4 text-primary" /><span className="text-muted-foreground">Manager</span><strong className="ml-auto">{selected.manager}</strong></div></div><DialogFooter><Button variant="outline" onClick={() => { setSelected(null); toast.success("Branch settings are ready to connect."); }}>Edit branch</Button><Button onClick={() => setSelected(null)}>Done <ArrowRight className="size-4" /></Button></DialogFooter></>}</DialogContent></Dialog>
  </AppShell>;
}

export const Route = createFileRoute("/branches")({
  head: () => ({ meta: pageMetadata("Branches", "Manage LaundryFlow locations, branch managers, and monthly performance.") }),
  component: BranchesPage,
});