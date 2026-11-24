import type { FastifyInstance } from "fastify";
import { createSupabaseClient } from "../config/supabase";

export async function supabaseRoutes(app: FastifyInstance) {
  app.get("/health/supabase", async (_request, reply) => {
    try {
      const supabase = createSupabaseClient();

      const { error } = await supabase
        .from("businesses")
        .select("id")
        .limit(1);

      // A missing table is still evidence that Supabase was reached.
      if (error && error.code !== "42P01" && error.code !== "PGRST205") {
        app.log.error(error);

        return reply.code(503).send({
          success: false,
          message: "Supabase connection failed.",
        });
      }

      return {
        success: true,
        service: "Supabase",
        connected: true,
        databaseReady: !error,
      };
    } catch (error) {
      app.log.error(error);

      return reply.code(503).send({
        success: false,
        message: "Unable to connect to Supabase.",
      });
    }
  });
}