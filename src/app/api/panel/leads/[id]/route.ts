import { getPanelApi } from "@/lib/api/instance";

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return getPanelApi().updateLead(req, id);
}
