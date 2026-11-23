import { createFileRoute } from "@tanstack/react-router";
import { AuthScreen } from "@/components/auth/auth-screen";
import { pageMetadata } from "@/lib/seo";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: pageMetadata("Reset password", "Request help recovering access to your LaundryFlow workspace.") }),
  component: () => <AuthScreen mode="forgot" />,
});