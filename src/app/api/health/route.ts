import { connection } from "next/server";
import { configuredProviders } from "@/lib/ai/llm";

// Liveness/readiness probe for uptime monitors. Public and read-only: it reports which subsystems are
// configured, never their values, and does not touch the database. connection() makes it run per request,
// otherwise the build-time environment would be frozen into a prerendered response.
export async function GET() {
  await connection();
  return Response.json(
    {
      ok: true,
      database: Boolean(process.env.QEYDAI_DATABASE_URL),
      ai: configuredProviders().length > 0,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
