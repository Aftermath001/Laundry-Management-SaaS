import type { FastifyInstance } from "fastify";
import { createSupabaseClient } from "../config/supabase";

export async function registerAuth(app: FastifyInstance) {
  app.decorateRequest("user", null);
  app.decorateRequest("supabase", null);

  app.decorate("authenticate", async (request, reply) => {
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      return reply.code(401).send({
        success: false,
        message: "Authentication required.",
      });
    }

    const token = authorization.slice(7).trim();

    if (!token) {
      return reply.code(401).send({
        success: false,
        message: "Invalid authentication token.",
      });
    }

    try {
      const supabase = createSupabaseClient(token);

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(token);

      if (error || !user) {
        return reply.code(401).send({
          success: false,
          message: "Invalid or expired authentication token.",
        });
      }

      request.user = user;
      request.supabase = supabase;
    } catch (error) {
      request.log.error(error);

      return reply.code(503).send({
        success: false,
        message: "Authentication service is unavailable.",
      });
    }
  });
}