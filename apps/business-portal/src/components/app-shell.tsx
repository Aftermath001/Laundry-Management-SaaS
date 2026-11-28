import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  LayoutDashboard,
  LogOut,
  Menu,
  PackageCheck,
  Search,
  Settings2,
  Shirt,
  Store,
  type LucideIcon,
  UsersRound,
  WashingMachine,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { apiClient } from "@/services/api-client";

const navigation: {
  label: string;
  to: "/" | "/orders" | "/branches" | "/employees" | "/services";
  icon: LucideIcon;
  count?: string;
}[] = [
  { label: "Overview", to: "/", icon: LayoutDashboard },
  { label: "Orders", to: "/orders", icon: Shirt, count: "18" },
  { label: "Branches", to: "/branches", icon: Store },
  { label: "Services", to: "/services", icon: PackageCheck },
  { label: "Team", to: "/employees", icon: UsersRound },
] as const;

type AuthStatus = "checking" | "authenticated" | "unauthenticated" | "error";
type PrimaryRole = "platform_admin" | "owner" | "admin" | "manager" | "staff" | "unassigned";

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (state) => state.location.pathname });
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
  const [accountLabel, setAccountLabel] = useState("Account");
  const [authError, setAuthError] = useState("");
  const [role, setRole] = useState<PrimaryRole>("unassigned");

  useEffect(() => {
    let active = true;
    let client: ReturnType<typeof getSupabaseBrowserClient>;

    try {
      client = getSupabaseBrowserClient();
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : "Supabase authentication is not configured.",
      );
      setAuthStatus("error");
      return;
    }

    client.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setAuthError(error.message);
        setAuthStatus("error");
        return;
      }
      if (!data.session) {
        setAuthStatus("unauthenticated");
        void navigate({ to: "/login" });
        return;
      }
      void resolveAuthorization(data.session.user.user_metadata, data.session.user.email);
    });

    const { data: authListener } = client.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (!session) {
        setAuthStatus("unauthenticated");
        void navigate({ to: "/login" });
        return;
      }
      void resolveAuthorization(session.user.user_metadata, session.user.email);
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  async function resolveAuthorization(metadata: Record<string, unknown>, email?: string) {
    try {
      const identity = await apiClient.get<{
        user: { full_name: string | null };
        authorization: { primary_role: PrimaryRole; requires_onboarding: boolean };
      }>("/v1/auth/me");
      if (
        identity.authorization.requires_onboarding ||
        identity.authorization.primary_role === "unassigned"
      ) {
        setAuthStatus("authenticated");
        void navigate({ to: "/onboarding" });
        return;
      }
      if (identity.authorization.primary_role === "platform_admin") {
        setRole("platform_admin");
        setAuthStatus("authenticated");
        setAuthError(
          "Platform administrator access is recognized. The platform administration portal is not yet available.",
        );
        return;
      }
      setRole(identity.authorization.primary_role);
      setAccountLabel(
        identity.user.full_name ||
          (typeof metadata["full_name"] === "string" ? metadata["full_name"] : email) ||
          "Account",
      );
      setAuthStatus("authenticated");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Unable to resolve your permissions.");
      setAuthStatus("error");
    }
  }

  async function signOut() {
    await getSupabaseBrowserClient().auth.signOut();
    await navigate({ to: "/login" });
  }

  const roleNavigation = navigation.filter((item) =>
    role === "owner" || role === "admin"
      ? true
      : role === "manager"
        ? item.to === "/" || item.to === "/orders"
        : role === "staff"
          ? item.to === "/orders"
          : false,
  );

  useEffect(() => {
    if (authStatus !== "authenticated" || role === "unassigned" || role === "platform_admin")
      return;
    if (!roleNavigation.some((item) => item.to === path))
      void navigate({ to: role === "staff" ? "/orders" : "/" });
  }, [authStatus, role, path, navigate]);

  if (authStatus !== "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
        <div className="max-w-md">
          {authStatus === "error" ? (
            <>
              <p className="text-sm font-semibold text-foreground">
                Authentication configuration required
              </p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{authError}</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Checking your LaundryFlow session…</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {role === "platform_admin" && authError ? (
        <div className="flex min-h-screen items-center justify-center p-6 text-center">
          <div>
            <h1 className="text-lg font-semibold">Platform Admin</h1>
            <p className="mt-2 text-sm text-muted-foreground">{authError}</p>
            <Button className="mt-4" onClick={() => void signOut()}>
              Sign out
            </Button>
          </div>
        </div>
      ) : (
        <div className="min-h-screen bg-background text-foreground">
          <aside
            className={cn(
              "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 lg:flex",
              collapsed ? "w-[5.25rem]" : "w-64",
            )}
          >
            <SidebarContent
              collapsed={collapsed}
              path={path}
              navigationItems={roleNavigation}
              onSignOut={signOut}
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={() => setCollapsed((current) => !current)}
              className="absolute -right-3 top-[5.3rem] size-7 rounded-full border border-border bg-card text-muted-foreground shadow-sm hover:text-foreground"
            >
              {collapsed ? <ChevronRight /> : <ChevronLeft />}
            </Button>
          </aside>

          {mobileOpen && (
            <div
              className="fixed inset-0 z-50 bg-foreground/30 lg:hidden"
              onClick={() => setMobileOpen(false)}
            >
              <aside
                className="flex h-full w-[min(19rem,84vw)] flex-col bg-sidebar text-sidebar-foreground"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex justify-end p-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Close navigation"
                    onClick={() => setMobileOpen(false)}
                    className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  >
                    <X />
                  </Button>
                </div>
                <SidebarContent
                  path={path}
                  navigationItems={roleNavigation}
                  onNavigate={() => setMobileOpen(false)}
                  onSignOut={signOut}
                />
              </aside>
            </div>
          )}

          <div
            className={cn(
              "min-h-screen transition-[padding] duration-200",
              collapsed ? "lg:pl-[5.25rem]" : "lg:pl-64",
            )}
          >
            <header className="sticky top-0 z-30 flex h-[4.25rem] items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur sm:px-7">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Open navigation"
                onClick={() => setMobileOpen(true)}
                className="-ml-2 lg:hidden"
              >
                <Menu />
              </Button>
              <div className="hidden items-center gap-2 text-sm text-muted-foreground md:flex">
                <span>LaundryFlow</span>
                <span className="text-border">/</span>
                <span className="font-medium text-foreground">
                  {navigation.find((item) => item.to === path)?.label ?? "Overview"}
                </span>
              </div>
              <div className="ml-auto flex items-center gap-2 sm:gap-3">
                <label className="relative hidden w-56 lg:block">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    aria-label="Search"
                    placeholder="Search anything…"
                    className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
                  />
                  <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-border px-1 text-[10px] text-muted-foreground">
                    ⌘ K
                  </kbd>
                </label>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Notifications"
                  className="relative text-muted-foreground"
                >
                  <Bell />
                  <span className="absolute right-2 top-2 size-1.5 rounded-full bg-primary ring-2 ring-card" />
                </Button>
                <span className="hidden h-7 w-px bg-border sm:block" />
                <Button
                  variant="ghost"
                  onClick={() => void signOut()}
                  className="h-9 gap-2 px-1.5 sm:px-2.5"
                  aria-label="Sign out"
                >
                  <span className="grid size-8 place-items-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                    {accountLabel.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="hidden text-left sm:block">
                    <span className="block max-w-36 truncate text-xs font-semibold leading-4">
                      {accountLabel}
                    </span>
                    <span className="block text-[11px] leading-4 text-muted-foreground">
                      Sign out
                    </span>
                  </span>
                  <LogOut className="size-3.5 text-muted-foreground" />
                </Button>
              </div>
            </header>
            <main className="mx-auto w-full max-w-[1440px] px-4 pb-24 pt-7 sm:px-7 lg:px-9 lg:pb-10">
              {children}
            </main>
          </div>

          <nav
            className={cn(
              "fixed inset-x-0 bottom-0 z-30 grid border-t border-border bg-card/95 px-2 pb-[env(safe-area-inset-bottom)] pt-1 backdrop-blur lg:hidden",
              roleNavigation.length >= 5
                ? "grid-cols-5"
                : roleNavigation.length === 4
                  ? "grid-cols-4"
                  : roleNavigation.length === 3
                    ? "grid-cols-3"
                    : "grid-cols-2",
            )}
          >
            {roleNavigation.map(({ label, to, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: to === "/" }}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] font-medium",
                  path === to ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-[18px]" />
                <span>{label}</span>
              </Link>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}

function SidebarContent({
  collapsed = false,
  path,
  navigationItems,
  onNavigate,
  onSignOut,
}: {
  collapsed?: boolean;
  path: string;
  navigationItems: typeof navigation;
  onNavigate?: () => void;
  onSignOut: () => void | Promise<void>;
}) {
  return (
    <>
      <Link
        to="/"
        onClick={onNavigate}
        className={cn(
          "flex h-[4.25rem] items-center gap-3 border-b border-sidebar-border px-5",
          collapsed && "justify-center px-2",
        )}
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <WashingMachine className="size-5" />
        </span>
        {!collapsed && (
          <span className="leading-tight">
            <span className="block text-[15px] font-bold tracking-tight">LaundryFlow</span>
            <span className="mt-0.5 block text-[10px] font-medium text-sidebar-foreground/60">
              OPERATIONS SUITE
            </span>
          </span>
        )}
      </Link>
      <div className="flex-1 overflow-y-auto px-3 py-5">
        {!collapsed && (
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/45">
            Workspace
          </p>
        )}
        <div className="space-y-1">
          {navigationItems.map(({ label, to, icon: Icon, count }) => {
            const active = path === to;
            return (
              <Link
                key={to}
                to={to}
                onClick={onNavigate}
                aria-label={collapsed ? label : undefined}
                title={collapsed ? label : undefined}
                activeOptions={{ exact: to === "/" }}
                className={cn(
                  "group flex h-10 items-center gap-3 rounded-md px-3 text-[13px] font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
                  collapsed && "justify-center px-0",
                )}
              >
                <Icon
                  className={cn(
                    "size-[17px] shrink-0",
                    active ? "text-sidebar-primary" : "text-sidebar-foreground/60",
                  )}
                />
                {!collapsed && (
                  <>
                    <span className="flex-1">{label}</span>
                    {count && (
                      <span className="rounded bg-sidebar-accent px-1.5 py-0.5 text-[10px] text-sidebar-foreground/65">
                        {count}
                      </span>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </div>
        {!collapsed && (
          <p className="mb-2 mt-8 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/45">
            Manage
          </p>
        )}
        {!collapsed && (
          <div className="space-y-1">
            <div
              className="flex h-10 cursor-not-allowed items-center gap-3 rounded-md px-3 text-[13px] text-sidebar-foreground/40"
              title="Coming soon"
            >
              <Settings2 className="size-[17px]" />
              <span className="flex-1">Settings</span>
            </div>
          </div>
        )}
      </div>
      <div className="space-y-1 border-t border-sidebar-border p-3">
        <button
          type="button"
          className={cn(
            "flex h-9 w-full items-center gap-3 rounded-md px-3 text-xs text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground",
            collapsed && "justify-center px-0",
          )}
        >
          <CircleHelp className="size-4" />
          {!collapsed && <span>Help & support</span>}
        </button>
        <button
          type="button"
          onClick={() => void onSignOut()}
          title="Sign out"
          className={cn(
            "flex h-9 w-full items-center gap-3 rounded-md px-3 text-xs text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground",
            collapsed && "justify-center px-0",
          )}
        >
          <LogOut className="size-4" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </>
  );
}
