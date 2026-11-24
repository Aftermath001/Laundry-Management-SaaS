import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, Droplets, ShieldCheck, WashingMachine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AuthMode = "login" | "register" | "forgot" | "onboarding";

const authCopy = {
  login: { title: "Welcome back", subtitle: "Sign in to manage your laundry business.", button: "Continue to workspace" },
  register: { title: "Create your account", subtitle: "Start running your laundry business with clarity.", button: "Create account" },
  forgot: { title: "Reset your password", subtitle: "Enter your email and we'll help you get back in.", button: "Send reset link" },
  onboarding: { title: "Set up your business", subtitle: "A few details to personalize your LaundryFlow workspace.", button: "Create workspace" },
} as const;

export function AuthScreen({ mode }: { mode: AuthMode }) {
  const [notice, setNotice] = useState("");
  const copy = authCopy[mode];
  const isOnboarding = mode === "onboarding";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("Sign-in isn't connected yet. This demo does not send or save your account details.");
  }

  return (
    <main className="grid min-h-screen bg-card lg:grid-cols-[minmax(360px,0.92fr)_minmax(500px,1.08fr)]">
      <section className="flex min-h-screen flex-col px-6 py-6 sm:px-10 lg:px-14 xl:px-20">
        <Link to="/" className="inline-flex w-fit items-center gap-2.5 text-foreground"><span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground"><WashingMachine className="size-5" /></span><span className="text-[15px] font-bold tracking-tight">LaundryFlow</span></Link>
        <div className="flex flex-1 items-center py-12"><div className="mx-auto w-full max-w-[390px]">
          <Link to="/" className="mb-8 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="size-3.5" />Back to overview</Link>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">LaundryFlow workspace</p>
          <h1 className="text-[29px] font-semibold tracking-tight text-foreground">{copy.title}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy.subtitle}</p>
          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            {isOnboarding && <><label className="block space-y-1.5 text-xs font-medium">Business name<Input required placeholder="e.g. Fresh Fold Laundry" /></label><label className="block space-y-1.5 text-xs font-medium">Business phone<Input required type="tel" placeholder="+254 7•• ••• •••" /></label></>}
            {mode === "register" && <label className="block space-y-1.5 text-xs font-medium">Full name<Input required autoComplete="name" placeholder="Alex Morgan" /></label>}
            {(mode === "register" || isOnboarding) && <label className="block space-y-1.5 text-xs font-medium">Business name<Input required placeholder="Your laundry business" /></label>}
            {!isOnboarding && <label className="block space-y-1.5 text-xs font-medium">Work email<Input required type="email" autoComplete="email" placeholder="you@business.com" /></label>}
            {(mode === "login" || mode === "register") && <label className="block space-y-1.5 text-xs font-medium">Password<Input required type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="At least 8 characters" minLength={8} /></label>}
            {mode === "login" && <div className="-mt-1 flex justify-end"><Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">Forgot password?</Link></div>}
            {isOnboarding && <label className="block space-y-1.5 text-xs font-medium">Your name<Input required placeholder="Business owner" /></label>}
            <Button type="submit" className="mt-2 h-10 w-full">{copy.button}<ArrowRight className="size-4" /></Button>
          </form>
          {notice && <div role="status" className="mt-4 rounded-md border border-warning/25 bg-warning/10 px-3.5 py-3 text-xs leading-5 text-foreground">{notice}</div>}
          <div className="mt-6 border-t border-border pt-5 text-center text-xs text-muted-foreground">
            {mode === "login" && <>New to LaundryFlow? <Link to="/register" className="font-semibold text-primary hover:underline">Create an account</Link></>}
            {mode === "register" && <>Already have an account? <Link to="/login" className="font-semibold text-primary hover:underline">Sign in</Link></>}
            {mode === "forgot" && <Link to="/login" className="font-semibold text-primary hover:underline">Return to sign in</Link>}
            {isOnboarding && <>Already set up? <Link to="/login" className="font-semibold text-primary hover:underline">Sign in instead</Link></>}
          </div>
          <p className="mt-7 text-center text-[10px] leading-5 text-muted-foreground">By continuing, you agree to LaundryFlow's Terms of Service and Privacy Policy.</p>
        </div></div>
        <p className="text-[10px] text-muted-foreground">© 2026 LaundryFlow. Built for better laundry days.</p>
      </section>

      <aside className="relative hidden overflow-hidden bg-sidebar px-12 py-12 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between xl:px-16">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-primary/15 to-transparent" />
        <div className="relative flex items-center gap-2 text-xs font-medium text-sidebar-foreground/65"><ShieldCheck className="size-4 text-sidebar-primary" />A simpler way to run laundry operations</div>
        <div className="relative mx-auto w-full max-w-md py-8">
          <div className="mb-9 flex items-center gap-4"><span className="grid size-14 place-items-center rounded-xl bg-sidebar-accent text-sidebar-primary"><Droplets className="size-7" /></span><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/55">LaundryFlow</p><p className="mt-1 text-xl font-semibold">One clear view of every branch.</p></div></div>
          <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/65 p-5 shadow-2xl shadow-sidebar/30">
            <div className="flex items-center justify-between"><div><p className="text-xs text-sidebar-foreground/60">Today's revenue</p><p className="mt-1 text-2xl font-semibold">KES 84,250</p></div><span className="rounded-full bg-success/15 px-2.5 py-1 text-[10px] font-semibold text-sidebar-primary">+12.8%</span></div>
            <div className="mt-6 flex h-24 items-end gap-2">{[36, 54, 46, 72, 61, 90, 76, 100, 69, 83, 58, 91].map((height, index) => <div key={`${height}-${index}`} className="flex-1 rounded-t-sm bg-sidebar-primary/70" style={{ height: `${height}%`, opacity: 0.45 + (index / 20) }} />)}</div>
            <div className="mt-5 grid grid-cols-3 gap-2 border-t border-sidebar-border pt-4">{[["Orders", "48"], ["In progress", "18"], ["Branches", "4"]].map(([label, value]) => <div key={label}><p className="text-[10px] text-sidebar-foreground/55">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>)}</div>
          </div>
          <div className="mt-6 flex gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-sidebar-primary text-[10px] font-bold text-sidebar-primary-foreground">LF</span><p className="text-xs leading-5 text-sidebar-foreground/65">“I can finally see what's happening at all my locations without calling each branch.”<span className="mt-1 block font-semibold text-sidebar-foreground">A Nairobi laundry owner</span></p></div>
        </div>
        <div className="relative flex items-center justify-between text-[10px] text-sidebar-foreground/45"><span>Secure business workspace</span><span className="flex gap-3"><Link to="/register" className="hover:text-sidebar-foreground">Get started</Link><Link to="/onboarding" className="hover:text-sidebar-foreground">Set up business</Link></span></div>
      </aside>
    </main>
  );
}