import { noStoreHeaders } from "@/lib/http/same-origin";

function gone() {
  return Response.json({ ok: false, error: "gone" }, { status: 410, headers: noStoreHeaders });
}

export function GET() {
  return gone();
}

export function POST() {
  return gone();
}
