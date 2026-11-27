import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";

const businessParamsSchema = z.object({
  businessId: z.string().uuid(),
});

const serviceParamsSchema = businessParamsSchema.extend({
  serviceId: z.string().uuid(),
});

const serviceUnitSchema = z.enum(["item", "kg", "load", "pair"]);

const createServiceSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).nullable().optional(),
  unit: serviceUnitSchema.optional().default("item"),
  unit_price: z.number().finite().min(0),
});

const updateServiceSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    description: z.string().trim().max(500).nullable(),
    unit: serviceUnitSchema,
    unit_price: z.number().finite().min(0),
    is_active: z.boolean(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one service field must be provided.",
  });

async function getMembership(
  request: FastifyRequest,
  businessId: string,
) {
  if (!request.supabase || !request.user) {
    return { membership: null, error: null, unauthenticated: true };
  }

  const { data: membership, error } = await request.supabase
    .from("business_members")
    .select("role")
    .eq("business_id", businessId)
    .eq("user_id", request.user.id)
    .eq("status", "active")
    .maybeSingle();

  return { membership, error, unauthenticated: false };
}

export async function serviceRoutes(app: FastifyInstance) {
  app.get(
    "/api/v1/businesses/:businessId/services",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const params = businessParamsSchema.safeParse(request.params);

      if (!params.success) {
        return reply.code(400).send({
          success: false,
          message: "Invalid business ID.",
        });
      }

      if (!request.supabase || !request.user) {
        return reply.code(401).send({
          success: false,
          message: "Authentication required.",
        });
      }

      const { membership, error: membershipError } = await getMembership(
        request,
        params.data.businessId,
      );

      if (membershipError) {
        request.log.error(membershipError);
        return reply.code(500).send({
          success: false,
          message: "Unable to verify business membership.",
        });
      }

      if (!membership) {
        return reply.code(403).send({
          success: false,
          message: "You do not have access to this business.",
        });
      }

      const { data: services, error } = await request.supabase
        .from("laundry_services")
        .select("*")
        .eq("business_id", params.data.businessId)
        .order("name", { ascending: true });

      if (error) {
        request.log.error(error);
        return reply.code(500).send({
          success: false,
          message: "Unable to retrieve services.",
        });
      }

      return {
        success: true,
        services: services ?? [],
      };
    },
  );

  app.post(
    "/api/v1/businesses/:businessId/services",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const params = businessParamsSchema.safeParse(request.params);
      const validation = createServiceSchema.safeParse(request.body);

      if (!params.success || !validation.success) {
        return reply.code(400).send({
          success: false,
          message: "Invalid service information.",
          errors: validation.success ? undefined : validation.error.issues,
        });
      }

      if (!request.supabase || !request.user) {
        return reply.code(401).send({
          success: false,
          message: "Authentication required.",
        });
      }

      const { membership, error: membershipError } = await getMembership(
        request,
        params.data.businessId,
      );

      if (membershipError) {
        request.log.error(membershipError);
        return reply.code(500).send({
          success: false,
          message: "Unable to verify business permissions.",
        });
      }

      if (!membership) {
        return reply.code(404).send({
          success: false,
          message: "Business not found.",
        });
      }

      if (!["owner", "admin"].includes(membership.role)) {
        return reply.code(403).send({
          success: false,
          message: "Only business owners and admins can create services.",
        });
      }

      const { data: service, error } = await request.supabase
        .from("laundry_services")
        .insert({
          business_id: params.data.businessId,
          ...validation.data,
        })
        .select("*")
        .single();

      if (error) {
        request.log.error(error);

        if (error.code === "23505") {
          return reply.code(409).send({
            success: false,
            message: "A service with this name already exists.",
          });
        }

        if (error.code === "42501") {
          return reply.code(403).send({
            success: false,
            message: "You do not have permission to create services.",
          });
        }

        return reply.code(400).send({
          success: false,
          message: "Unable to create service.",
        });
      }

      return reply.code(201).send({
        success: true,
        message: "Service created successfully.",
        service,
      });
    },
  );

  app.patch(
    "/api/v1/businesses/:businessId/services/:serviceId",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const params = serviceParamsSchema.safeParse(request.params);
      const validation = updateServiceSchema.safeParse(request.body);

      if (!params.success) {
        return reply.code(400).send({
          success: false,
          message: "Invalid business or service ID.",
        });
      }

      if (!validation.success) {
        return reply.code(400).send({
          success: false,
          message: "Invalid service information.",
          errors: validation.error.issues,
        });
      }

      if (!request.supabase || !request.user) {
        return reply.code(401).send({
          success: false,
          message: "Authentication required.",
        });
      }

      const { membership, error: membershipError } = await getMembership(
        request,
        params.data.businessId,
      );

      if (membershipError) {
        request.log.error(membershipError);
        return reply.code(500).send({
          success: false,
          message: "Unable to verify business permissions.",
        });
      }

      if (!membership) {
        return reply.code(404).send({
          success: false,
          message: "Business not found.",
        });
      }

      if (!["owner", "admin"].includes(membership.role)) {
        return reply.code(403).send({
          success: false,
          message: "Only business owners and admins can update services.",
        });
      }

      const { data: service, error } = await request.supabase
        .from("laundry_services")
        .update(validation.data)
        .eq("id", params.data.serviceId)
        .eq("business_id", params.data.businessId)
        .select("*")
        .maybeSingle();

      if (error) {
        request.log.error(error);

        if (error.code === "23505") {
          return reply.code(409).send({
            success: false,
            message: "A service with this name already exists.",
          });
        }

        if (error.code === "42501") {
          return reply.code(403).send({
            success: false,
            message: "You do not have permission to update this service.",
          });
        }

        return reply.code(400).send({
          success: false,
          message: "Unable to update service.",
        });
      }

      if (!service) {
        return reply.code(404).send({
          success: false,
          message: "Service not found.",
        });
      }

      return {
        success: true,
        message: "Service updated successfully.",
        service,
      };
    },
  );
}
