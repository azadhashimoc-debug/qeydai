import { getStore } from "@/lib/api/instance";
import { databaseConfigured, isPostgresConfigured, pingPostgres } from "@/lib/crm/store";
import { reportServerError } from "@/lib/observability/alerts";

const NO_STORE = { "cache-control": "no-store" } as const;

export async function GET() {
  if (!databaseConfigured()) {
    return Response.json(
      { ok: false, status: "unavailable_during_build" },
      { status: 503, headers: NO_STORE },
    );
  }

  if (isPostgresConfigured()) {
    try {
      const ok = await pingPostgres();
      if (!ok) {
        return Response.json(
          { ok: false, status: "degraded", storage: "postgres" },
          { status: 503, headers: NO_STORE },
        );
      }
      return Response.json(
        { ok: true, status: "ok", storage: "postgres" },
        { status: 200, headers: NO_STORE },
      );
    } catch (err) {
      void reportServerError("api.health.postgres", err);
      return Response.json(
        { ok: false, status: "degraded", storage: "postgres" },
        { status: 503, headers: NO_STORE },
      );
    }
  }

  if (getStore() === null) {
    return Response.json(
      { ok: false, status: "degraded", storage: "sqlite" },
      { status: 503, headers: NO_STORE },
    );
  }

  return Response.json(
    { ok: true, status: "ok", storage: "sqlite" },
    { status: 200, headers: NO_STORE },
  );
}
