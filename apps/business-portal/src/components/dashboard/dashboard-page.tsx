import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  ClipboardList,
  Droplets,
  MapPin,
  Plus,
  Shirt,
  Store,
  UsersRound,
  Wallet,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/app-shell";
import {
  AvatarInitials,
  MetricCard,
  OrderStatusBadge,
  PageHeading,
  SectionTitle,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  DEMO_BRANCHES,
  DEMO_ORDERS,
  DEMO_TRANSACTIONS,
  REVENUE_TREND,
  formatKES,
} from "@/data/demo-data";

export function DashboardPage() {
  const activeOrders = DEMO_ORDERS.filter((order) => order.status !== "Completed").length;
  return (
    <AppShell>
      <PageHeading
        eyebrow="Monday, 23 November 2026"
        title="Good morning, Alex"
        description="Here's what's happening across your laundry business today."
        action={
          <>
            <Link to="/orders">
              <Button variant="outline" className="h-9">
                <ClipboardList className="size-4" />
                View orders
              </Button>
            </Link>
            <Link to="/orders">
              <Button className="h-9">
                <Plus className="size-4" />
                New order
              </Button>
            </Link>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-3 min-[540px]:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total revenue"
          value="KES 1.86M"
          change="12.8%"
          note="vs. last month"
          icon={Wallet}
        />
        <MetricCard
          label="Total orders"
          value="1,284"
          change="8.2%"
          note="vs. last month"
          icon={Shirt}
        />
        <MetricCard
          label="Pending orders"
          value="48"
          change="4.6%"
          positive={false}
          note="18 due today"
          icon={Activity}
        />
        <MetricCard
          label="Active branches"
          value="4"
          change="1 new"
          note="Across Nairobi"
          icon={Store}
        />
      </div>

      <div className="mb-6 grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(290px,0.85fr)]">
        <section className="rounded-lg border border-border bg-card p-4 shadow-[0_1px_2px_0_var(--color-border)] sm:p-5">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <SectionTitle title="Revenue overview" />
              <p className="-mt-3 text-xs text-muted-foreground">
                Daily performance across all branches
              </p>
            </div>
            <select
              aria-label="Revenue period"
              defaultValue="This week"
              className="h-8 rounded-md border border-input bg-card px-2.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring"
            >
              <option>This week</option>
              <option>This month</option>
              <option>This year</option>
            </select>
          </div>
          <div className="mb-1 flex items-baseline gap-2">
            <span className="text-2xl font-semibold tracking-tight">KES 486,200</span>
            <span className="inline-flex items-center text-[11px] font-semibold text-success">
              <ArrowUpRight className="size-3" />
              14.2%
            </span>
          </div>
          <div className="h-[220px] w-full pt-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={REVENUE_TREND} margin={{ top: 8, right: 5, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 5" />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  dy={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                  tickFormatter={(value: number) => `${value}k`}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 8, borderColor: "var(--border)", fontSize: 12 }}
                  formatter={(value) => [`KES ${Number(value) * 1_000}`, "Revenue"]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  fill="url(#revenueFill)"
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-border pt-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-primary" />
              Revenue
            </span>
            <span>
              Compared to last week{" "}
              <strong className="ml-1 font-semibold text-foreground">+14.2%</strong>
            </span>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-4 shadow-[0_1px_2px_0_var(--color-border)] sm:p-5">
          <SectionTitle
            title="Order activity"
            action={
              <button type="button" className="text-xs font-medium text-primary hover:underline">
                This week <span aria-hidden>⌄</span>
              </button>
            }
          />
          <p className="-mt-2 text-xs text-muted-foreground">Orders by status today</p>
          <div className="mt-6 space-y-5">
            {[
              { label: "Processing", value: 28, total: 48, color: "bg-primary" },
              { label: "Ready for collection", value: 12, total: 48, color: "bg-success" },
              { label: "Out for delivery", value: 8, total: 48, color: "bg-chart-3" },
            ].map((item) => (
              <div key={item.label}>
                <div className="mb-2 flex justify-between text-xs">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-semibold tabular-nums">{item.value}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${item.color}`}
                    style={{ width: `${(item.value / item.total) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-7 grid grid-cols-2 gap-3 border-t border-border pt-4">
            <div>
              <p className="text-[11px] text-muted-foreground">Completed this week</p>
              <p className="mt-1 text-lg font-semibold">326</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">On-time delivery</p>
              <p className="mt-1 text-lg font-semibold">96.8%</p>
            </div>
          </div>
          <Link
            to="/orders"
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary"
          >
            See all orders <ArrowRight className="size-3" />
          </Link>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.85fr)]">
        <section className="min-w-0 rounded-lg border border-border bg-card shadow-[0_1px_2px_0_var(--color-border)]">
          <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-5">
            <div>
              <SectionTitle title="Recent orders" />
              <p className="-mt-3 text-xs text-muted-foreground">Your latest customer orders</p>
            </div>
            <Link to="/orders" className="text-xs font-semibold text-primary">
              View all
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="border-b border-border text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3">Order</th>
                  <th className="px-3 py-3">Customer</th>
                  <th className="px-3 py-3">Due time</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {DEMO_ORDERS.slice(0, 4).map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-border last:border-0 hover:bg-muted/40"
                  >
                    <td className="px-5 py-3.5 text-xs font-semibold text-primary">{order.id}</td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <AvatarInitials
                          name={order.customer}
                          initials={order.initials}
                          className="size-7 text-[9px]"
                        />
                        <span className="whitespace-nowrap text-xs font-medium">
                          {order.customer}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-xs text-muted-foreground">
                      {order.due}
                    </td>
                    <td className="px-3 py-3.5">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right text-xs font-semibold">
                      {formatKES(order.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <section className="rounded-lg border border-border bg-card p-4 shadow-[0_1px_2px_0_var(--color-border)] sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <SectionTitle title="Branch performance" />
              <Link
                to="/branches"
                aria-label="View branches"
                className="text-muted-foreground hover:text-primary"
              >
                <ArrowRight className="size-4" />
              </Link>
            </div>
            <div className="space-y-4">
              {DEMO_BRANCHES.slice(0, 3).map((branch, index) => (
                <div key={branch.id} className="flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-md bg-secondary text-secondary-foreground">
                    <MapPin className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-semibold">{branch.name}</p>
                      <span className="whitespace-nowrap text-xs font-semibold">
                        {formatKES(branch.revenue)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1 flex-1 rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${[86, 72, 58][index]}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {branch.orders} orders
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-lg border border-border bg-card p-4 shadow-[0_1px_2px_0_var(--color-border)] sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <SectionTitle title="Recent transactions" />
              <Link to="/orders" className="text-xs font-semibold text-primary">
                View all
              </Link>
            </div>
            <div className="space-y-3.5">
              {DEMO_TRANSACTIONS.slice(0, 3).map((transaction) => (
                <div key={transaction.id} className="flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-success/10 text-success">
                    <Droplets className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">{transaction.customer}</p>
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                      {transaction.method} · {transaction.time}
                    </p>
                  </div>
                  <span className="whitespace-nowrap text-xs font-semibold">
                    {formatKES(transaction.amount)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between rounded-lg border border-primary/15 bg-primary/5 px-4 py-3.5">
        <div className="flex items-center gap-3">
          <span className="grid size-8 place-items-center rounded-md bg-primary/10 text-primary">
            <UsersRound className="size-4" />
          </span>
          <div>
            <p className="text-xs font-semibold">Your team is growing</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Manage roles and access for your branches.
            </p>
          </div>
        </div>
        <Link to="/employees">
          <Button variant="outline" size="sm" className="shrink-0 bg-card">
            Manage team
          </Button>
        </Link>
      </div>
    </AppShell>
  );
}
