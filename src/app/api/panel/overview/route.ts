import { getPanelApi } from "@/lib/api/instance";

export const GET = (req: Request) => getPanelApi().overview(req);
