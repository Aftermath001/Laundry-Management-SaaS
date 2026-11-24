
import type { FastifyInstance } from "fastify";
import { z } from "zod";

const createBusinessSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
});

const updateBusinessSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: z.string().email().nullable(),
    phone: z.string().max(30).nullable(),
    address: z.string().max(255).nullable(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one business field must be provided.",
  });

const createBranchSchema = z.object({
  name: z.string().trim().min(2).max(100),
  code: z.string().trim().max(30).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional(),
  address: z.string().max(255).optional(),
  is_main: z.boolean().optional().default(false),
});

const updateBranchSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    code: z.string().trim().max(30).nullable(),
    phone: z.string().max(30).nullable(),
    email: z.string().email().nullable(),
    address: z.string().max(255).nullable(),
    is_main: z.boolean(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one branch field must be provided.",
  });

const businessParamsSchema = z.object({
  businessId: z.string().uuid(),
});

const branchParamsSchema = z.object({
  businessId: z.string().uuid(),
  branchId: z.string().uuid(),
});

export async function businessRoutes(app: FastifyInstance) {

  // ==========================================
  // 1. CREATE BUSINESS
  // ==========================================

  app.post(
    "/api/v1/businesses",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const validation = createBusinessSchema.safeParse(request.body);

      if (!validation.success) {
        return reply.code(400).send({
          success: false,
          message: "Invalid business information.",
          errors: validation.error.issues,
        });
      }

      if (!request.supabase || !request.user) {
        return reply.code(401).send({
          success: false,
          message: "Authentication required.",
        });
      }

      const { name, slug, email, phone } = validation.data;

      const { data, error } = await request.supabase.rpc(
        "create_business",
        {
          business_name: name,
          business_slug: slug,
          business_email: email ?? null,
          business_phone: phone ?? null,
        },
      );

      if (error) {
        request.log.error(error);

        if (error.code === "23505") {
          return reply.code(409).send({
            success: false,
            message: "This business URL is already registered.",
          });
        }

        return reply.code(400).send({
          success: false,
          message: "Unable to create business.",
        });
      }

      return reply.code(201).send({
        success: true,
        message: "Business created successfully.",
        business: {
          id: data,
          name,
          slug,
          owner_id: request.user.id,
        },
      });
    },
  );

  // ==========================================
  // 2. GET USER BUSINESSES
  // ==========================================

  app.get(
    "/api/v1/businesses",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      if (!request.supabase || !request.user) {
        return reply.code(401).send({
          success: false,
          message: "Authentication required.",
        });
      }

      const { data: memberships, error: membershipError } =
        await request.supabase
          .from("business_members")
          .select("business_id, role, status")
          .eq("user_id", request.user.id)
          .eq("status", "active");

      if (membershipError) {
        request.log.error(membershipError);

        return reply.code(500).send({
          success: false,
          message: "Unable to retrieve business memberships.",
        });
      }

      const businessIds = (memberships ?? []).map(
        (membership) => membership.business_id,
      );

      if (businessIds.length === 0) {
        return {
          success: true,
          businesses: [],
        };
      }

      const { data: businesses, error: businessError } =
        await request.supabase
          .from("businesses")
          .select("*")
          .in("id", businessIds);

      if (businessError) {
        request.log.error(businessError);

        return reply.code(500).send({
          success: false,
          message: "Unable to retrieve businesses.",
        });
      }

      const results = (businesses ?? []).map((business) => {
        const membership = memberships!.find(
          (item) => item.business_id === business.id,
        );

        return {
          ...business,
          role: membership?.role,
          membership_status: membership?.status,
        };
      });

      return {
        success: true,
        businesses: results,
      };
    },
  );

  // ==========================================
  // 3. GET SINGLE BUSINESS
  // ==========================================

  app.get(
    "/api/v1/businesses/:businessId",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const params = businessParamsSchema.safeParse(request.params);

      if (!params.success) {
        return reply.code(400).send({
          success: false,
          message: "Invalid business ID.",
        });
      }

      if (!request.supabase) {
        return reply.code(401).send({
          success: false,
          message: "Authentication required.",
        });
      }

      const { data: business, error } = await request.supabase
        .from("businesses")
        .select("*")
        .eq("id", params.data.businessId)
        .maybeSingle();

      if (error) {
        request.log.error(error);

        return reply.code(500).send({
          success: false,
          message: "Unable to retrieve business.",
        });
      }

      if (!business) {
        return reply.code(404).send({
          success: false,
          message: "Business not found.",
        });
      }

      return {
        success: true,
        business,
      };
    },
  );

  // ==========================================
  // 4. UPDATE BUSINESS PROFILE
  // ==========================================

  app.patch(
    "/api/v1/businesses/:businessId",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const params = businessParamsSchema.safeParse(request.params);
      const validation = updateBusinessSchema.safeParse(request.body);

      if (!params.success) {
        return reply.code(400).send({
          success: false,
          message: "Invalid business ID.",
        });
      }

      if (!validation.success) {
        return reply.code(400).send({
          success: false,
          message: "Invalid business information.",
          errors: validation.error.issues,
        });
      }

      if (!request.supabase || !request.user) {
        return reply.code(401).send({
          success: false,
          message: "Authentication required.",
        });
      }

      const { data: membership, error: membershipError } =
        await request.supabase
          .from("business_members")
          .select("role")
          .eq("business_id", params.data.businessId)
          .eq("user_id", request.user.id)
          .eq("status", "active")
          .maybeSingle();

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
          message: "You do not have permission to update this business.",
        });
      }

      const { data: business, error } = await request.supabase
        .from("businesses")
        .update(validation.data)
        .eq("id", params.data.businessId)
        .select("*")
        .maybeSingle();

      if (error) {
        request.log.error(error);

        return reply.code(400).send({
          success: false,
          message: "Unable to update business.",
        });
      }

      if (!business) {
        return reply.code(404).send({
          success: false,
          message: "Business not found.",
        });
      }

      return {
        success: true,
        message: "Business profile updated successfully.",
        business,
      };
    },
  );

  // ==========================================
  // 5. LIST BUSINESS BRANCHES
  // ==========================================

  app.get(
    "/api/v1/businesses/:businessId/branches",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const params = businessParamsSchema.safeParse(request.params);

      if (!params.success) {
        return reply.code(400).send({
          success: false,
          message: "Invalid business ID.",
        });
      }

      if (!request.supabase) {
        return reply.code(401).send({
          success: false,
          message: "Authentication required.",
        });
      }

      const { data: branches, error } = await request.supabase
        .from("branches")
        .select("*")
        .eq("business_id", params.data.businessId)
        .order("created_at", { ascending: true });

      if (error) {
        request.log.error(error);

        return reply.code(500).send({
          success: false,
          message: "Unable to retrieve branches.",
        });
      }

      return {
        success: true,
        branches: branches ?? [],
      };
    },
  );

  // ==========================================
  // 6. CREATE BUSINESS BRANCH
  // ==========================================

  app.post(
    "/api/v1/businesses/:businessId/branches",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const params = businessParamsSchema.safeParse(request.params);
      const validation = createBranchSchema.safeParse(request.body);

      if (!params.success || !validation.success) {
        return reply.code(400).send({
          success: false,
          message: "Invalid branch information.",
          errors: validation.success
            ? undefined
            : validation.error.issues,
        });
      }

      if (!request.supabase) {
        return reply.code(401).send({
          success: false,
          message: "Authentication required.",
        });
      }

      const { data: branch, error } = await request.supabase
        .from("branches")
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
            message: "A branch with this code or main-branch status already exists.",
          });
        }

        if (error.code === "42501") {
          return reply.code(403).send({
            success: false,
            message: "You do not have permission to create branches.",
          });
        }

        return reply.code(400).send({
          success: false,
          message: "Unable to create branch.",
        });
      }

      return reply.code(201).send({
        success: true,
        message: "Branch created successfully.",
        branch,
      });
    },
  );

  // ==========================================
  // 7. GET SINGLE BRANCH
  // ==========================================

  app.get(
    "/api/v1/businesses/:businessId/branches/:branchId",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const params = branchParamsSchema.safeParse(request.params);

      if (!params.success) {
        return reply.code(400).send({
          success: false,
          message: "Invalid business or branch ID.",
        });
      }

      if (!request.supabase) {
        return reply.code(401).send({
          success: false,
          message: "Authentication required.",
        });
      }

      const { data: branch, error } = await request.supabase
        .from("branches")
        .select("*")
        .eq("id", params.data.branchId)
        .eq("business_id", params.data.businessId)
        .maybeSingle();

      if (error) {
        request.log.error(error);

        return reply.code(500).send({
          success: false,
          message: "Unable to retrieve branch.",
        });
      }

      if (!branch) {
        return reply.code(404).send({
          success: false,
          message: "Branch not found.",
        });
      }

      return {
        success: true,
        branch,
      };
    },
  );

  // ==========================================
  // 8. UPDATE BRANCH
  // ==========================================

  app.patch(
    "/api/v1/businesses/:businessId/branches/:branchId",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const params = branchParamsSchema.safeParse(request.params);
      const validation = updateBranchSchema.safeParse(request.body);

      if (!params.success) {
        return reply.code(400).send({
          success: false,
          message: "Invalid business or branch ID.",
        });
      }

      if (!validation.success) {
        return reply.code(400).send({
          success: false,
          message: "Invalid branch information.",
          errors: validation.error.issues,
        });
      }

      if (!request.supabase || !request.user) {
        return reply.code(401).send({
          success: false,
          message: "Authentication required.",
        });
      }

      const { data: membership, error: membershipError } =
        await request.supabase
          .from("business_members")
          .select("role")
          .eq("business_id", params.data.businessId)
          .eq("user_id", request.user.id)
          .eq("status", "active")
          .maybeSingle();

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
          message: "You do not have permission to update branches.",
        });
      }

      const { data: branch, error } = await request.supabase
        .from("branches")
        .update(validation.data)
        .eq("id", params.data.branchId)
        .eq("business_id", params.data.businessId)
        .select("*")
        .maybeSingle();

      if (error) {
        request.log.error(error);

        if (error.code === "23505") {
          return reply.code(409).send({
            success: false,
            message: "A branch with this code or main-branch status already exists.",
          });
        }

        if (error.code === "42501") {
          return reply.code(403).send({
            success: false,
            message: "You do not have permission to update this branch.",
          });
        }

        return reply.code(400).send({
          success: false,
          message: "Unable to update branch.",
        });
      }

      if (!branch) {
        return reply.code(404).send({
          success: false,
          message: "Branch not found.",
        });
      }

      return {
        success: true,
        message: "Branch updated successfully.",
        branch,
      };
    },
  );

  // ==========================================
  // 9. DELETE BRANCH
  // ==========================================

  app.delete(
    "/api/v1/businesses/:businessId/branches/:branchId",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const params = branchParamsSchema.safeParse(request.params);

      if (!params.success) {
        return reply.code(400).send({
          success: false,
          message: "Invalid business or branch ID.",
        });
      }

      if (!request.supabase || !request.user) {
        return reply.code(401).send({
          success: false,
          message: "Authentication required.",
        });
      }

      // Verify active membership and role.

      const { data: membership, error: membershipError } =
        await request.supabase
          .from("business_members")
          .select("role")
          .eq("business_id", params.data.businessId)
          .eq("user_id", request.user.id)
          .eq("status", "active")
          .maybeSingle();

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
          message: "You do not have permission to delete branches.",
        });
      }

      // Confirm that the branch belongs to this business.

      const { data: branch, error: branchError } =
        await request.supabase
          .from("branches")
          .select("id, name, is_main")
          .eq("id", params.data.branchId)
          .eq("business_id", params.data.businessId)
          .maybeSingle();

      if (branchError) {
        request.log.error(branchError);

        return reply.code(500).send({
          success: false,
          message: "Unable to retrieve branch.",
        });
      }

      if (!branch) {
        return reply.code(404).send({
          success: false,
          message: "Branch not found.",
        });
      }

      // Prevent deleting any branch marked as the main branch.

      if (branch.is_main) {
        return reply.code(409).send({
          success: false,
          message:
            "The main branch cannot be deleted. Assign another branch as main first.",
        });
      }

      // Delete branch. Database RLS independently enforces permissions.

      const { error: deleteError } = await request.supabase
        .from("branches")
        .delete()
        .eq("id", params.data.branchId)
        .eq("business_id", params.data.businessId);

      if (deleteError) {
        request.log.error(deleteError);

        if (deleteError.code === "23514") {
          return reply.code(409).send({
            success: false,
            message:
              "The main branch cannot be deleted. Assign another branch as main first.",
          });
        }

        if (deleteError.code === "42501") {
          return reply.code(403).send({
            success: false,
            message: "You do not have permission to delete this branch.",
          });
        }

        return reply.code(400).send({
          success: false,
          message: "Unable to delete branch.",
        });
      }

      return {
        success: true,
        message: "Branch deleted successfully.",
        branch_id: branch.id,
      };
    },
  );
}
