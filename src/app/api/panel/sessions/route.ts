import { getPanelApi } from "@/lib/api/instance";

export const GET = (req: Request) => getPanelApi().listSessions(req);
export const POST = (req: Request) => getPanelApi().createSession(req);
