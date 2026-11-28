import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";

const businessParamsSchema = z.object({
  businessId: z.string().uuid(),
});

const orderParamsSchema = businessParamsSchema.extend({
  orderId: z.string().uuid(),
});

const orderStatusSchema = z.enum([
  "pending",
  "processing",
  "ready",
  "collected",
  "delivered",
  "cancelled",
]);

const listQuerySchema = z.object({
  status: orderStatusSchema.optional(),
  branch_id: z.string().uuid().optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

const createOrderSchema = z.object({
  branch_id: z.string().uuid(),
  customer_name: z.string().trim().min(2).max(150),
  customer_phone: z.string().trim().min(3).max(30),
  due_at: z.string().datetime().nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
  items: z
    .array(
      z.object({
        service_id: z.string().uuid(),
        quantity: z
          .number()
          .finite()
          .positive()
          .max(100000)
          .refine((value) => Number.isInteger(value * 100), {
            message: "Quantity can have at most two decimal places.",
          }),
      }),
    )
    .min(1)
    .max(50),
});

async function getMembership(request: FastifyRequest, businessId: string) {
  if (!request.supabase || !request.user) {
    return { membership: null, error: null };
  }

  const { data: membership, error } = await request.supabase
    .from("business_members")
    .select("role")
    .eq("business_id", businessId)
    .eq("user_id", request.user.id)
    .eq("status", "active")
    .maybeSingle();

  return { membership, error };
}

export async function orderRoutes(app: FastifyInstance) {
  app.get(
    "/api/v1/businesses/:businessId/orders",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const params = businessParamsSchema.safeParse(request.params);
      const query = listQuerySchema.safeParse(request.query);

      if (!params.success || !query.success) {
        return reply.code(400).send({
          success: false,
          message: "Invalid order filters or business ID.",
          errors: query.success ? undefined : query.error.issues,
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

      const { status, branch_id, search, page, limit } = query.data;
      let ordersQuery = request.supabase
        .from("laundry_orders")
        .select("*", { count: "exact" })
        .eq("business_id", params.data.businessId)
        .order("created_at", { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (status) ordersQuery = ordersQuery.eq("status", status);
      if (branch_id) ordersQuery = ordersQuery.eq("branch_id", branch_id);
      if (search) ordersQuery = ordersQuery.ilike("customer_name", `%${search}%`);

      const { data: orders, error, count } = await ordersQuery;

      if (error) {
        request.log.error(error);
        return reply.code(500).send({
          success: false,
          message: "Unable to retrieve orders.",
        });
      }

      const orderIds = (orders ?? []).map((order) => order.id);
      let items: Record<string, unknown>[] = [];

      if (orderIds.length > 0) {
        const { data: orderItems, error: itemsError } = await request.supabase
          .from("laundry_order_items")
          .select("*")
          .in("order_id", orderIds);

        if (itemsError) {
          request.log.error(itemsError);
          return reply.code(500).send({
            success: false,
            message: "Unable to retrieve order items.",
          });
        }

        items = orderItems ?? [];
      }

      return {
        success: true,
        orders: (orders ?? []).map((order) => ({
          ...order,
          items: items.filter((item) => item.order_id === order.id),
        })),
        pagination: {
          page,
          limit,
          total_records: count ?? 0,
          total_pages: Math.ceil((count ?? 0) / limit),
        },
      };
    },
  );

  app.get(
    "/api/v1/businesses/:businessId/orders/:orderId",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const params = orderParamsSchema.safeParse(request.params);

      if (!params.success) {
        return reply.code(400).send({
          success: false,
          message: "Invalid business or order ID.",
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

      const { data: order, error } = await request.supabase
        .from("laundry_orders")
        .select("*")
        .eq("id", params.data.orderId)
        .eq("business_id", params.data.businessId)
        .maybeSingle();

      if (error) {
        request.log.error(error);
        return reply.code(500).send({
          success: false,
          message: "Unable to retrieve order.",
        });
      }

      if (!order) {
        return reply.code(404).send({
          success: false,
          message: "Order not found.",
        });
      }

      const { data: items, error: itemsError } = await request.supabase
        .from("laundry_order_items")
        .select("*")
        .eq("order_id", order.id)
        .eq("business_id", params.data.businessId);

      if (itemsError) {
        request.log.error(itemsError);
        return reply.code(500).send({
          success: false,
          message: "Unable to retrieve order items.",
        });
      }

      return {
        success: true,
        order: {
          ...order,
          items: items ?? [],
        },
      };
    },
  );

  app.post(
    "/api/v1/businesses/:businessId/orders",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const params = businessParamsSchema.safeParse(request.params);
      const validation = createOrderSchema.safeParse(request.body);

      if (!params.success || !validation.success) {
        return reply.code(400).send({
          success: false,
          message: "Invalid order information.",
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
          message: "Unable to verify business membership.",
        });
      }

      if (!membership) {
        return reply.code(403).send({
          success: false,
          message: "You do not have access to this business.",
        });
      }

      const { data: orderId, error: createError } = await request.supabase.rpc(
        "create_laundry_order",
        {
          p_business_id: params.data.businessId,
          p_branch_id: validation.data.branch_id,
          p_customer_name: validation.data.customer_name,
          p_customer_phone: validation.data.customer_phone,
          p_items: validation.data.items,
          p_due_at: validation.data.due_at ?? null,
          p_notes: validation.data.notes ?? null,
        },
      );

      if (createError) {
        request.log.error(createError);

        if (createError.code === "42501") {
          return reply.code(403).send({
            success: false,
            message: createError.message,
          });
        }

        if (["22023", "22P02", "23503", "23514"].includes(createError.code ?? "")) {
          return reply.code(400).send({
            success: false,
            message: createError.message,
          });
        }

        return reply.code(500).send({
          success: false,
          message: "Unable to create order.",
        });
      }

      const { data: order, error: orderError } = await request.supabase
        .from("laundry_orders")
        .select("*")
        .eq("id", orderId)
        .eq("business_id", params.data.businessId)
        .single();

      if (orderError || !order) {
        request.log.error(orderError);
        return reply.code(500).send({
          success: false,
          message: "Order was created but could not be retrieved.",
        });
      }

      const { data: items, error: itemsError } = await request.supabase
        .from("laundry_order_items")
        .select("*")
        .eq("order_id", order.id)
        .eq("business_id", params.data.businessId);

      if (itemsError) {
        request.log.error(itemsError);
        return reply.code(500).send({
          success: false,
          message: "Order was created but its items could not be retrieved.",
        });
      }

      return reply.code(201).send({
        success: true,
        message: "Order created successfully.",
        order: {
          ...order,
          items: items ?? [],
        },
      });
    },
  );

  app.patch(
    "/api/v1/businesses/:businessId/orders/:orderId/status",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const params = orderParamsSchema.safeParse(request.params);
      const validation = z.object({ status: orderStatusSchema }).safeParse(request.body);

      if (!params.success || !validation.success) {
        return reply.code(400).send({
          success: false,
          message: "Invalid order or status information.",
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
          message: "Unable to verify business membership.",
        });
      }

      if (!membership) {
        return reply.code(403).send({
          success: false,
          message: "You do not have access to this business.",
        });
      }

      const { data: order, error } = await request.supabase
        .from("laundry_orders")
        .update({ status: validation.data.status })
        .eq("id", params.data.orderId)
        .eq("business_id", params.data.businessId)
        .select("*")
        .maybeSingle();

      if (error) {
        request.log.error(error);
        return reply.code(error.code === "42501" ? 403 : 500).send({
          success: false,
          message: error.code === "42501"
            ? "You do not have permission to update this order."
            : "Unable to update order status.",
        });
      }

      if (!order) {
        return reply.code(404).send({
          success: false,
          message: "Order not found or branch access denied.",
        });
      }

      return {
        success: true,
        message: "Order status updated successfully.",
        order,
      };
    },
  );
}
