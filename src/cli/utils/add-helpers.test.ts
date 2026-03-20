import { describe, it, expect } from "vitest";
import { parseMode, applyModeDeps } from "./add-helpers.js";

describe("parseMode", () => {
  it('defaults to "copy" for undefined', () => {
    expect(parseMode(undefined)).toBe("copy");
  });

  it("accepts valid mode values", () => {
    expect(parseMode("copy")).toBe("copy");
    expect(parseMode("package")).toBe("package");
  });

  it("throws for invalid values", () => {
    expect(() => parseMode("invalid")).toThrow();
  });
});

describe("applyModeDeps", () => {
  it("removes keyscope in copy mode", () => {
    const result = applyModeDeps(["keyscope", "lodash"], "copy", "latest");
    expect(result).toEqual(["lodash"]);
  });

  it("adds keyscope in package mode", () => {
    const result = applyModeDeps(["lodash"], "package", "latest");
    expect(result).toContain("keyscope");
    expect(result).toContain("lodash");
  });

  it("adds keyscope with version spec in package mode", () => {
    const result = applyModeDeps(["lodash"], "package", "0.1.0");
    expect(result).toContain("keyscope@0.1.0");
  });

  it("strips pre-existing versioned keyscope dep before applying mode", () => {
    const result = applyModeDeps(["keyscope@0.1.0", "lodash"], "package", "latest");
    expect(result).toContain("keyscope");
    expect(result).not.toContain("keyscope@0.1.0");
  });

  it("removes keyscope entirely in copy mode even if versioned dep is present", () => {
    const result = applyModeDeps(["keyscope@0.1.0", "lodash"], "copy", "latest");
    expect(result).toEqual(["lodash"]);
  });
});
