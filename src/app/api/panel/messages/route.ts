import { getPanelApi } from "@/lib/api/instance";

export const GET = (req: Request) => getPanelApi().listMessages(req);
export const POST = (req: Request) => getPanelApi().createMessage(req);
