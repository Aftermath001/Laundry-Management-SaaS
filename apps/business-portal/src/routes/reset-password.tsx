import { createFileRoute } from "@tanstack/react-router";
import { AuthScreen } from "@/components/auth/auth-screen";
import { pageMetadata } from "@/lib/seo";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: pageMetadata("Choose a new password", "Update your LaundryFlow account password."),
  }),
  component: () => <AuthScreen mode="reset" />,
});
