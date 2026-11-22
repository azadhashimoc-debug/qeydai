import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/crm/delivery", () => ({ deliverOne: vi.fn(async () => undefined) }));

import { ingestMessage, workspaceTransaction } from "@/lib/crm/store";
import { getAiSettings, saveAiSettings } from "./settings";
import { autoReply } from "./auto-reply";

const suite = process.env.QEYDAI_DATABASE_URL ? describe : describe.skip;
const tenant = "pg_ai_" + randomUUID().slice(0, 20);
const saved: Record<string, string | undefined> = {};
const realFetch = globalThis.fetch;

function modelSays(content: string) {
  globalThis.fetch = vi.fn(async () =>
    new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 })) as typeof fetch;
}

async function inbound(event: string, text: string) {
  const message = { channel: "telegram" as const, account: "bot_" + tenant, event, sender: "9001", name: "Test", text };
  expect(await ingestMessage(tenant, message)).toBe(true);
  return message;
}

async function counts() {
  return workspaceTransaction(tenant, async (db) => {
    const sent = await db.query("SELECT count(*)::int AS n FROM sales_messages WHERE tenant_id=$1 AND sender='ai'", [tenant]);
    const outbox = await db.query("SELECT count(*)::int AS n FROM sales_outbox WHERE tenant_id=$1", [tenant]);
    const tasks = await db.query("SELECT count(*)::int AS n FROM sales_tasks WHERE tenant_id=$1 AND id LIKE 'ai-handoff:%'", [tenant]);
    return { ai: sent.rows[0].n as number, outbox: outbox.rows[0].n as number, tasks: tasks.rows[0].n as number };
  });
}

suite("AI auto reply on PostgreSQL", () => {
  beforeAll(() => {
    for (const key of ["GROQ_API_KEY", "NVIDIA_API_KEY", "QEYDAI_AI_KNOWLEDGE"]) saved[key] = process.env[key];
    process.env.GROQ_API_KEY = "test-key";
    delete process.env.NVIDIA_API_KEY;
    process.env.QEYDAI_AI_KNOWLEDGE = JSON.stringify({ [tenant]: "Haircut 20 AZN. Open 10:00-19:00." });
  });
  afterAll(() => {
    globalThis.fetch = realFetch;
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("queues an AI reply and an outbox row for a confident answer", async () => {
    modelSays(JSON.stringify({ reply: "A haircut is 20 AZN.", handoff: false }));
    await autoReply(tenant, await inbound("e1", "How much is a haircut?"));
    expect(await counts()).toEqual({ ai: 1, outbox: 1, tasks: 0 });
  });

  it("on handoff sends nothing and opens exactly one staff task", async () => {
    modelSays(JSON.stringify({ reply: "", handoff: true }));
    await autoReply(tenant, await inbound("e2", "I want a big discount, this is a complaint"));
    const after = await counts();
    expect(after.ai).toBe(1);
    expect(after.tasks).toBe(1);
  });

  it("sends nothing when the model output is unusable", async () => {
    modelSays("sorry, no json here");
    await autoReply(tenant, await inbound("e3", "hello?"));
    expect((await counts()).ai).toBe(1);
  });

  it("panel settings override the env text, and enabled=false stops replies", async () => {
    const read = () => workspaceTransaction(tenant, (db) => getAiSettings(db, tenant));
    expect((await read()).source).toBe("env");

    await workspaceTransaction(tenant, (db) => saveAiSettings(db, tenant, { enabled: true, knowledge: "Panel text: manicure 15 AZN." }));
    expect(await read()).toMatchObject({ enabled: true, source: "database", knowledge: "Panel text: manicure 15 AZN." });

    const before = (await counts()).ai;
    await workspaceTransaction(tenant, (db) => saveAiSettings(db, tenant, { enabled: false, knowledge: "Panel text: manicure 15 AZN." }));
    modelSays(JSON.stringify({ reply: "Manicure is 15 AZN.", handoff: false }));
    await autoReply(tenant, await inbound("e4", "price of manicure?"));
    expect((await counts()).ai).toBe(before);

    await workspaceTransaction(tenant, (db) => saveAiSettings(db, tenant, { enabled: true, knowledge: "Panel text: manicure 15 AZN." }));
    modelSays(JSON.stringify({ reply: "Manicure is 15 AZN.", handoff: false }));
    await autoReply(tenant, await inbound("e5", "price of manicure again?"));
    expect((await counts()).ai).toBe(before + 1);
  });

  it("never calls the provider for card-like text and opens a handoff task", async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
    const before = await counts();
    await autoReply(tenant, await inbound("e6", "my card is 4169 7388 1234 5678"));
    expect(fetchSpy).not.toHaveBeenCalled();
    const after = await counts();
    expect(after.ai).toBe(before.ai);
    expect(after.tasks).toBe(before.tasks + 1);
  });
});
