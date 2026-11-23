import type { User, SupabaseClient } from "@supabase/supabase-js";
import type {
  FastifyReply,
  FastifyRequest,
} from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    user: User | null;
    supabase: SupabaseClient | null;
  }

  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
  }
}