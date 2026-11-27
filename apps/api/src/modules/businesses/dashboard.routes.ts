import type { FastifyInstance } from "fastify";
import { z } from "zod";

const paramsSchema = z.object({ businessId: z.string().uuid() });

export async function dashboardRoutes(app: FastifyInstance) {
  app.get("/api/v1/businesses/:businessId/dashboard", { preHandler: [app.authenticate] }, async (request, reply) => {
    const params = paramsSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ success:false, message:"Invalid business ID." });
    if (!request.supabase || !request.user) return reply.code(401).send({ success:false, message:"Authentication required." });

    const businessId = params.data.businessId;
    const { data: membership, error: membershipError } = await request.supabase
      .from("business_members").select("role").eq("business_id", businessId)
      .eq("user_id", request.user.id).eq("status","active").maybeSingle();
    if (membershipError) {
      request.log.error(membershipError);
      return reply.code(500).send({success:false,message:"Unable to verify business membership."});
    }
    if (!membership || !["owner","admin"].includes(membership.role)) {
      return reply.code(403).send({success:false,message:"Business dashboard access denied."});
    }

    const today = new Date();
    const dayStart = new Date(today.getFullYear(),today.getMonth(),today.getDate()).toISOString();
    const monthStart = new Date(today.getFullYear(),today.getMonth(),1).toISOString();
    const weekStart = new Date(today.getFullYear(),today.getMonth(),today.getDate()-6).toISOString();
    const [
      ordersResult, branchesResult, paymentTodayResult, paymentMonthResult, recentPaymentsResult, weekPaymentsResult
    ] = await Promise.all([
      request.supabase.from("laundry_orders").select("id,order_number,customer_name,customer_phone,status,total_amount,due_at,created_at,branch_id").eq("business_id",businessId).order("created_at",{ascending:false}),
      request.supabase.from("branches").select("id,name,status").eq("business_id",businessId),
      request.supabase.from("laundry_payments").select("amount").eq("business_id",businessId).eq("status","completed").gte("paid_at",dayStart),
      request.supabase.from("laundry_payments").select("amount").eq("business_id",businessId).eq("status","completed").gte("paid_at",monthStart),
      request.supabase.from("laundry_payments").select("id,amount,method,customer_name,paid_at,reference").eq("business_id",businessId).eq("status","completed").order("paid_at",{ascending:false}).limit(5),
      request.supabase.from("laundry_payments").select("amount,paid_at").eq("business_id",businessId).eq("status","completed").gte("paid_at",weekStart)
    ]);
    const errors=[ordersResult.error,branchesResult.error,paymentTodayResult.error,paymentMonthResult.error,recentPaymentsResult.error,weekPaymentsResult.error].filter(Boolean);
    if(errors.length) {
      request.log.error(errors);
      return reply.code(500).send({success:false,message:"Unable to load dashboard data."});
    }
    const orders=ordersResult.data??[];
    const active=orders.filter(o=>!["collected","delivered","cancelled"].includes(o.status));
    const sum=(rows: {amount:number|string}[]|null)=> (rows??[]).reduce((total,row)=>total+Number(row.amount),0);
    return {
      success:true,
      dashboard:{
        order_counts:{total:orders.length,active:active.length,pending:orders.filter(o=>o.status==="pending").length,processing:orders.filter(o=>o.status==="processing").length,ready:orders.filter(o=>o.status==="ready").length},
        revenue:{today:sum(paymentTodayResult.data),month:sum(paymentMonthResult.data),trend:(weekPaymentsResult.data??[]).reduce((days,row)=>{const key=new Date(row.paid_at).toLocaleDateString("en",{weekday:"short"});days[key]=(days[key]??0)+Number(row.amount);return days;},{} as Record<string,number>)},
        branches:{active:(branchesResult.data??[]).filter(b=>b.status==="active").length,total:(branchesResult.data??[]).length},
        recent_orders:orders.slice(0,5),
        recent_payments:recentPaymentsResult.data??[],
      }
    };
  });
}
