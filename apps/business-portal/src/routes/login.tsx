import { createFileRoute } from "@tanstack/react-router";
import { AuthScreen } from "@/components/auth/auth-screen";
import { pageMetadata } from "@/lib/seo";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: pageMetadata("Sign in", "Sign in to your LaundryFlow laundry operations workspace."),
  }),
  component: () => <AuthScreen mode="login" />,
});
