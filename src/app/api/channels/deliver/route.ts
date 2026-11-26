import { secretsMatch } from "@/lib/crm/channels";
import { listDeliveryTenants } from "@/lib/crm/connections-store";
import { deliverBatch } from "@/lib/crm/delivery";
import { reportServerError } from "@/lib/observability/alerts";

function isAuthorizedWorker(req: Request): boolean {
  const auth = req.headers.get("authorization") ?? "";
  const workerKey = (process.env.QEYDAI_CRM_WORKER_KEY ?? "").trim();
  const cronSecret = (process.env.CRON_SECRET ?? "").trim();
  if (workerKey && secretsMatch(auth, `Bearer ${workerKey}`)) return true;
  if (cronSecret && secretsMatch(auth, `Bearer ${cronSecret}`)) return true;
  return false;
}

async function handleDeliver(req: Request): Promise<Response> {
  if (!isAuthorizedWorker(req)) {
    return new Response(null, { status: 401 });
  }
  try {
    const tenants = await listDeliveryTenants();
    const result = await Promise.allSettled(tenants.map((tenant) => deliverBatch(tenant, 20)));
    const rejected = result.find((item) => item.status === "rejected");
    if (rejected && rejected.status === "rejected") {
      void reportServerError("api.channels.deliver", rejected.reason, { tenants: tenants.length });
    }
    const processed = result.reduce(
      (sum, item) => sum + (item.status === "fulfilled" ? item.value : 0),
      0,
    );
    return Response.json(
      { ok: !rejected, tenants: tenants.length, processed },
      { status: rejected ? 503 : 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    void reportServerError("api.channels.deliver", err);
    return new Response(null, { status: 503 });
  }
}

export const GET = handleDeliver;
export const POST = handleDeliver;
