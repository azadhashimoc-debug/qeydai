import { getEnrollApi } from "@/lib/api/instance";

export const GET = (req: Request) => getEnrollApi().listSessions(req);
export const POST = (req: Request) => getEnrollApi().createSession(req);
