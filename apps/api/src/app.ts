
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";

import { registerAuth } from "./plugins/auth";
import { supabaseRoutes } from "./routes/supabase";
import { businessRoutes } from "./modules/businesses/businesses.routes";
import { invitationRoutes } from "./modules/businesses/invitations.routes";
import { dashboardRoutes } from "./modules/businesses/dashboard.routes";

export async function buildApp() {
  const app = Fastify({
    logger: {
      level:
        process.env.NODE_ENV === "production"
          ? "info"
          : "debug",
      redact: [
        "req.headers.authorization",
        "req.headers.cookie",
        "headers.authorization",
      ],
    },
    trustProxy: process.env.NODE_ENV === "production",
  });

  // Allowed frontend origins
  const allowedOrigins = [
    process.env.BUSINESS_PORTAL_URL,
    process.env.CUSTOMER_PORTAL_URL,
    process.env.SUPER_ADMIN_URL,
  ].filter((origin): origin is string => Boolean(origin));

  // Security headers
  await app.register(helmet);

  // CORS configuration
  await app.register(cors, {
    origin: allowedOrigins,
    credentials: true,
    methods: [
      "GET",
      "POST",
      "PATCH",
      "PUT",
      "DELETE",
      "OPTIONS",
    ],
  });

  // Rate limiting
  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });

  // Register authentication BEFORE protected routes
  await registerAuth(app);

  // Health check
  app.get("/health", async () => ({
    success: true,
    service: "LaundryFlow API",
    status: "healthy",
    timestamp: new Date().toISOString(),
  }));

  // API version information
  app.get("/api/v1", async () => ({
    success: true,
    message: "LaundryFlow API is running",
    version: "1.0.0",
  }));

  // Authenticated identity and server-resolved authorization context.
  app.get(
    "/api/v1/auth/me",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      if (!request.supabase || !request.user) {
        return reply.code(401).send({
          success: false,
          message: "Authentication required.",
        });
      }

      const [adminResult, membershipsResult, assignmentsResult] =
        await Promise.all([
          request.supabase
            .from("platform_admins")
            .select("user_id")
            .eq("user_id", request.user.id)
            .maybeSingle(),
          request.supabase
            .from("business_members")
            .select("business_id, role, status")
            .eq("user_id", request.user.id)
            .eq("status", "active"),
          request.supabase
            .from("branch_members")
            .select("business_id, branch_id, status")
            .eq("user_id", request.user.id)
            .eq("status", "active"),
        ]);

      const queryError =
        adminResult.error || membershipsResult.error || assignmentsResult.error;

      if (queryError) {
        request.log.error(queryError);
        return reply.code(500).send({
          success: false,
          message: "Unable to load your account permissions.",
        });
      }

      const isPlatformAdmin = Boolean(adminResult.data);
      const memberships = membershipsResult.data ?? [];
      const branchAssignments = assignmentsResult.data ?? [];

      const primaryRole = isPlatformAdmin
        ? "platform_admin"
        : memberships.some((item) => item.role === "owner")
          ? "owner"
          : memberships.some((item) => item.role === "admin")
            ? "admin"
            : memberships.some((item) => item.role === "manager")
              ? "manager"
              : memberships.some((item) => item.role === "staff")
                ? "staff"
                : "unassigned";

      return {
        success: true,
        user: {
          id: request.user.id,
          email: request.user.email,
          full_name:
            typeof request.user.user_metadata?.full_name === "string"
              ? request.user.user_metadata.full_name
              : null,
        },
        authorization: {
          primary_role: primaryRole,
          is_platform_admin: isPlatformAdmin,
          memberships,
          branch_assignments: branchAssignments,
          requires_onboarding:
            !isPlatformAdmin && memberships.length === 0,
        },
      };
    },
  );

  // Supabase health check
  await app.register(supabaseRoutes);

  // Business management routes
  await app.register(businessRoutes);
  await app.register(invitationRoutes);
  await app.register(dashboardRoutes);

  return app;
}
