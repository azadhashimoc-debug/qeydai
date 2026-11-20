import { getEnrollApi } from "@/lib/api/instance";

export const POST = (req: Request) => getEnrollApi().upsertLead(req);
