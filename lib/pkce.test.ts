import { describe, it, expect } from "vitest";
import { generateCodeVerifier, generateCodeChallenge } from "./pkce";

describe("generateCodeVerifier", () => {
  it("returns a string of at least 43 characters", () => {
    const verifier = generateCodeVerifier();
    expect(verifier.length).toBeGreaterThanOrEqual(43);
  });

  it("contains only URL-safe base64 characters (no +, /, =)", () => {
    const verifier = generateCodeVerifier();
    expect(verifier).toMatch(/^[A-Za-z0-9\-_]+$/);
  });

  it("generates different values on each call", () => {
    const v1 = generateCodeVerifier();
    const v2 = generateCodeVerifier();
    expect(v1).not.toBe(v2);
  });
});

describe("generateCodeChallenge", () => {
  it("returns a non-empty string", async () => {
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    expect(challenge.length).toBeGreaterThan(0);
  });

  it("contains only URL-safe base64 characters (no +, /, =)", async () => {
    const challenge = await generateCodeChallenge("testverifier");
    expect(challenge).toMatch(/^[A-Za-z0-9\-_]+$/);
  });

  it("is deterministic for the same input", async () => {
    const verifier = "a_stable_test_verifier_value";
    const c1 = await generateCodeChallenge(verifier);
    const c2 = await generateCodeChallenge(verifier);
    expect(c1).toBe(c2);
  });

  it("produces different challenges for different verifiers", async () => {
    const c1 = await generateCodeChallenge("verifier_one");
    const c2 = await generateCodeChallenge("verifier_two");
    expect(c1).not.toBe(c2);
  });
});
