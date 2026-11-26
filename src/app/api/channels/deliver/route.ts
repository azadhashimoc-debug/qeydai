import { secretsMatch } from "@/lib/crm/channels";
import { configuredConnections } from "@/lib/crm/config";
import { deliverOne } from "@/lib/crm/delivery";
import { reportServerError } from "@/lib/observability/alerts";

export async function POST(req: Request) {
  if (!secretsMatch(req.headers.get("authorization") ?? "", process.env.QEYDAI_CRM_WORKER_KEY
    ? `Bearer ${process.env.QEYDAI_CRM_WORKER_KEY}` : "")) {
    return new Response(null, { status: 401 });
  }
  try {
    const tenants = [...new Set(configuredConnections().map((connection) => connection.tenant))];
    const result = await Promise.allSettled(tenants.map(deliverOne));
    const rejected = result.find((item) => item.status === "rejected");
    if (rejected && rejected.status === "rejected") {
      void reportServerError("api.channels.deliver", rejected.reason, { tenants: tenants.length });
    }
    return Response.json({ processed: result.filter((item) => item.status === "fulfilled" && item.value).length },
      { status: rejected ? 503 : 200 });
  } catch (err) {
    void reportServerError("api.channels.deliver", err);
    return new Response(null, { status: 503 });
  }
}
