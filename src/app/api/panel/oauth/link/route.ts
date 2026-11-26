import { finishLinkAccount } from "@/lib/api/oauth-routes";

export async function POST(req: Request) {
  return finishLinkAccount(req);
}
