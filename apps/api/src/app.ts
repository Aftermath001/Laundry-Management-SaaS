
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";

import { registerAuth } from "./plugins/auth";
import { supabaseRoutes } from "./routes/supabase";
import { businessRoutes } from "./modules/businesses/businesses.routes";

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

  // Authenticated user endpoint
  app.get(
    "/api/v1/auth/me",
    {
      preHandler: [app.authenticate],
    },
    async (request) => ({
      success: true,
      user: {
        id: request.user!.id,
        email: request.user!.email,
      },
    }),
  );

  // Supabase health check
  await app.register(supabaseRoutes);

  // Business management routes
  await app.register(businessRoutes);

  return app;
}
