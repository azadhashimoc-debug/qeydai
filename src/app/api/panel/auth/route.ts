import { getPanelApi } from "@/lib/api/instance";

export const GET = (req: Request) => getPanelApi().authGet(req);
export const POST = (req: Request) => getPanelApi().authPost(req);
export const DELETE = (req: Request) => getPanelApi().authDelete(req);
