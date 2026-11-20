import { describe, expect, it } from "vitest";
import { clientKey, noStoreHeaders, sameOrigin } from "./same-origin";

describe("sameOrigin", () => {
  it("allows same-origin browser requests and non-browser requests without Origin", () => {
    expect(
      sameOrigin(
        new Request("https://qeyd.az/api/lead", {
          method: "POST",
          headers: { host: "qeyd.az", origin: "https://qeyd.az", "sec-fetch-site": "same-origin" },
        }),
      ),
    ).toBe(true);

    expect(
      sameOrigin(
        new Request("https://qeyd.az/api/lead", {
          method: "POST",
          headers: { host: "qeyd.az" },
        }),
      ),
    ).toBe(true);
  });

  it("rejects cross-site Sec-Fetch-Site, mismatched Origin, and malformed Origin", () => {
    expect(
      sameOrigin(
        new Request("https://qeyd.az/api/lead", {
          method: "POST",
          headers: { host: "qeyd.az", "sec-fetch-site": "cross-site" },
        }),
      ),
    ).toBe(false);

    expect(
      sameOrigin(
        new Request("https://qeyd.az/api/lead", {
          method: "POST",
          headers: { host: "qeyd.az", origin: "https://evil.example" },
        }),
      ),
    ).toBe(false);

    expect(
      sameOrigin(
        new Request("https://qeyd.az/api/lead", {
          method: "POST",
          headers: { host: "qeyd.az", origin: "not-a-url" },
        }),
      ),
    ).toBe(false);
  });

  it("falls back to req.url host when Host header is absent", () => {
    expect(
      sameOrigin(
        new Request("https://qeyd.az/api/lead", {
          method: "POST",
          headers: { origin: "https://qeyd.az" },
        }),
      ),
    ).toBe(true);
  });
});

describe("clientKey", () => {
  it("ignores proxy headers by default when TRUST_PROXY is unset", () => {
    expect(
      clientKey(
        new Request("https://qeyd.az/api/lead", {
          headers: { "x-real-ip": "198.51.100.5", "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
        }),
      ),
    ).toBe("unknown");
  });

  it("reads only x-real-ip when mode is x-real-ip", () => {
    expect(
      clientKey(
        new Request("https://qeyd.az/api/lead", {
          headers: { "x-real-ip": " 198.51.100.5 ", "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
        }),
        "x-real-ip",
      ),
    ).toBe("198.51.100.5");

    expect(
      clientKey(
        new Request("https://qeyd.az/api/lead", {
          headers: { "x-forwarded-for": "203.0.113.9" },
        }),
        "x-real-ip",
      ),
    ).toBe("unknown");
  });

  it("reads only rightmost x-forwarded-for hop when mode is x-forwarded-for", () => {
    expect(
      clientKey(
        new Request("https://qeyd.az/api/lead", {
          headers: { "x-real-ip": "spoofed.real.ip", "x-forwarded-for": "spoofed.ip, 203.0.113.9 " },
        }),
        "x-forwarded-for",
      ),
    ).toBe("203.0.113.9");

    expect(clientKey(new Request("https://qeyd.az/api/lead"), "x-forwarded-for")).toBe("unknown");
  });
});

describe("noStoreHeaders", () => {
  it("exposes cache-control: no-store", () => {
    expect(noStoreHeaders).toEqual({ "cache-control": "no-store" });
  });
});
