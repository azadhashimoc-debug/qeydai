import { secretsMatch } from "@/lib/crm/channels";
import { configuredConnections } from "@/lib/crm/config";
import { deliverOne } from "@/lib/crm/delivery";

export async function POST(req: Request) {
  if (!secretsMatch(req.headers.get("authorization") ?? "", process.env.QEYDAI_CRM_WORKER_KEY
    ? `Bearer ${process.env.QEYDAI_CRM_WORKER_KEY}` : "")) {
    return new Response(null, { status: 401 });
  }
  try {
    const tenants = [...new Set(configuredConnections().map((connection) => connection.tenant))];
    const result = await Promise.allSettled(tenants.map(deliverOne));
    return Response.json({ processed: result.filter((item) => item.status === "fulfilled" && item.value).length },
      { status: result.some((item) => item.status === "rejected") ? 503 : 200 });
  } catch {
    return new Response(null, { status: 503 });
  }
}
