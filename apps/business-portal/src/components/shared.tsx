import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/data/demo-data";

export function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">{eyebrow}</p>}
        <h1 className="text-[25px] font-semibold leading-tight tracking-tight text-foreground sm:text-[28px]">{title}</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

export function MetricCard({ label, value, change, positive = true, note, icon: Icon }: { label: string; value: string; change: string; positive?: boolean; note: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <section className="min-w-0 rounded-lg border border-border bg-card p-4 shadow-[0_1px_2px_0_var(--color-border)] sm:p-5">
      <div className="flex items-center justify-between gap-2"><span className="text-[13px] font-medium text-muted-foreground">{label}</span><span className="grid size-8 place-items-center rounded-md bg-secondary text-primary"><Icon className="size-4" /></span></div>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1"><span className="text-[25px] font-semibold tabular-nums tracking-tight text-foreground">{value}</span><span className={cn("inline-flex items-center gap-0.5 text-[11px] font-semibold", positive ? "text-success" : "text-destructive")}>{positive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}{change}</span></div>
      <p className="mt-1 text-[11px] text-muted-foreground">{note}</p>
    </section>
  );
}

const statusClasses: Record<OrderStatus, string> = {
  Created: "border-border bg-muted text-muted-foreground",
  Confirmed: "border-primary/20 bg-primary/10 text-primary",
  "Laundry Received": "border-chart-2/25 bg-chart-2/10 text-chart-2",
  Processing: "border-primary/20 bg-primary/10 text-primary",
  "Quality Check": "border-chart-3/30 bg-chart-3/15 text-warning",
  "Ready for Collection": "border-success/20 bg-success/10 text-success",
  "Out for Delivery": "border-chart-5/20 bg-chart-5/10 text-chart-5",
  Collected: "border-border bg-muted text-muted-foreground",
  Completed: "border-success/20 bg-success/10 text-success",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge variant="outline" className={cn("whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold", statusClasses[status])}>{status}</Badge>;
}

export function AvatarInitials({ name, initials, className }: { name: string; initials: string; className?: string }) {
  return <span aria-label={name} className={cn("grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-[11px] font-semibold text-secondary-foreground", className)}>{initials}</span>;
}

export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-[15px] font-semibold text-foreground">{title}</h2>{action}</div>;
}

export function EmptyState({ title, message }: { title: string; message: string }) {
  return <div className="grid min-h-44 place-items-center px-6 py-10 text-center"><div><p className="text-sm font-semibold text-foreground">{title}</p><p className="mt-1 max-w-sm text-xs text-muted-foreground">{message}</p></div></div>;
}