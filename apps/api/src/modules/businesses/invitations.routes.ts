import type { FastifyInstance } from "fastify";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";

const createSchema = z.object({
  email: z.string().trim().email().max(254),
  role: z.enum(["admin", "manager", "staff"]),
  branch_id: z.string().uuid().nullable().optional(),
});
const acceptSchema = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/i) });
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function invitationRoutes(app: FastifyInstance) {
  app.post("/api/v1/businesses/:businessId/invitations",
    { preHandler: [app.authenticate] }, async (request, reply) => {
      const params = z.object({ businessId: z.string().uuid() }).safeParse(request.params);
      const body = createSchema.safeParse(request.body);
      if (!params.success || !body.success)
        return reply.code(400).send({ success: false, message: "Invalid invitation details." });
      if (!request.supabase || !request.user)
        return reply.code(401).send({ success: false, message: "Authentication required." });

      const businessId = params.data.businessId;
      const { data: member, error: memberError } = await request.supabase
        .from("business_members").select("role").eq("business_id", businessId)
        .eq("user_id", request.user.id).eq("status", "active").maybeSingle();
      if (memberError) {
        request.log.error(memberError);
        return reply.code(500).send({ success: false, message: "Unable to verify permissions." });
      }
      if (!member || !["owner", "admin"].includes(member.role))
        return reply.code(403).send({ success: false, message: "Only owners and admins can invite team members." });

      const { email, role, branch_id: branchId } = body.data;
      if ((role === "admin" && branchId) || (role !== "admin" && !branchId))
        return reply.code(400).send({ success: false, message: "Admins have business-wide access; managers and staff require a branch assignment." });
      if (branchId) {
        const { data: branch, error } = await request.supabase.from("branches")
          .select("id").eq("id", branchId).eq("business_id", businessId).maybeSingle();
        if (error) {
          request.log.error(error);
          return reply.code(500).send({ success: false, message: "Unable to verify branch." });
        }
        if (!branch) return reply.code(400).send({ success: false, message: "Selected branch does not belong to this business." });
      }

      const token = randomBytes(32).toString("hex");
      const { data: invitation, error } = await request.supabase.from("business_invitations")
        .insert({ business_id: businessId, branch_id: branchId ?? null, email: email.toLowerCase(),
          role, token_hash: hashToken(token), invited_by: request.user.id })
        .select("id, email, role, branch_id, expires_at").single();
      if (error) {
        if (error.code === "23505")
          return reply.code(409).send({ success: false, message: "A pending invitation already exists for this email." });
        request.log.error(error);
        return reply.code(400).send({ success: false, message: "Unable to create invitation." });
      }

      const portalUrl = (process.env.BUSINESS_PORTAL_URL || "").replace(/\/$/, "");
      if (!portalUrl) {
        request.log.error("BUSINESS_PORTAL_URL is not configured.");
        return reply.code(201).send({ success: true, invitation, invitation_token: token,
          message: "Invitation created. Configure BUSINESS_PORTAL_URL to generate a shareable link." });
      }
      return reply.code(201).send({ success: true, invitation,
        invitation_url: `${portalUrl}/register?invite=${token}`,
        message: "Invitation created. Share this link with the invited team member." });
    });

  app.post("/api/v1/invitations/accept", { preHandler: [app.authenticate] },
    async (request, reply) => {
      const body = acceptSchema.safeParse(request.body);
      if (!body.success) return reply.code(400).send({ success: false, message: "Invalid invitation token." });
      if (!request.supabase || !request.user)
        return reply.code(401).send({ success: false, message: "Authentication required." });
      const { data, error } = await request.supabase.rpc("accept_business_invitation", {
        invitation_token_hash: hashToken(body.data.token),
      });
      if (error) {
        request.log.info({ code: error.code }, "Invitation acceptance rejected.");
        return reply.code(400).send({ success: false, message: error.message || "Unable to accept invitation." });
      }
      return { success: true, membership: data, message: "Invitation accepted successfully." };
    });
}
