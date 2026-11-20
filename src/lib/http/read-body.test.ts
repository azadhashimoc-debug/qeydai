import { describe, expect, it } from "vitest";
import { readLimitedUtf8 } from "./read-body";

describe("readLimitedUtf8", () => {
  it("reads UTF-8 body within byte limit", async () => {
    const req = new Request("http://site.test/x", {
      method: "POST",
      body: JSON.stringify({ name: "Aygün" }),
    });
    expect(await readLimitedUtf8(req, 64)).toBe('{"name":"Aygün"}');
  });

  it("cancels oversized chunked stream without draining all chunks", async () => {
    let chunksRead = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        chunksRead++;
        if (chunksRead <= 20) controller.enqueue(new Uint8Array(1024).fill(97));
        else controller.close();
      },
    });
    const req = new Request("http://site.test/x", {
      method: "POST",
      body: stream,
      duplex: "half",
    } as RequestInit);
    expect(await readLimitedUtf8(req, 2048)).toBeNull();
    expect(chunksRead).toBeLessThanOrEqual(3);
  });
});
