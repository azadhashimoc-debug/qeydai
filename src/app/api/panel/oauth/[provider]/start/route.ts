import { startOAuth } from "@/lib/api/oauth-routes";
import { isOAuthProvider } from "@/lib/api/oauth";

export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (!isOAuthProvider(provider)) return new Response("Not found", { status: 404 });
  return startOAuth(req, provider);
}
