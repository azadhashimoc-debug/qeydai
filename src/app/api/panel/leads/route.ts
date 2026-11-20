import { getPanelApi } from "@/lib/api/instance";

export const GET = (req: Request) => getPanelApi().listLeads(req);
export const POST = (req: Request) => getPanelApi().createLead(req);
