import { createFileRoute } from "@tanstack/react-router";
import { AuthScreen } from "@/components/auth/auth-screen";
import { pageMetadata } from "@/lib/seo";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: pageMetadata("Business setup", "Set up your LaundryFlow business workspace.") }),
  component: () => <AuthScreen mode="onboarding" />,
});