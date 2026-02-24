import { describe, it, expect } from "vitest";
import { parseMode, applyModeDeps } from "../../utils/add-helpers.js";

describe("parseMode", () => {
  it('returns "copy" for "copy"', () => {
    expect(parseMode("copy")).toBe("copy");
  });

  it('returns "package" for "package"', () => {
    expect(parseMode("package")).toBe("package");
  });

  it("is case insensitive", () => {
    expect(parseMode("COPY")).toBe("copy");
    expect(parseMode("Package")).toBe("package");
  });

  it("throws for invalid values", () => {
    expect(() => parseMode("invalid")).toThrow('Invalid --mode: "invalid"');
  });

  it('defaults to "copy" for undefined', () => {
    expect(parseMode(undefined)).toBe("copy");
  });
});

describe("applyModeDeps", () => {
  it("removes keyscope in copy mode", () => {
    const result = applyModeDeps(["keyscope", "lodash"], "copy", "latest");
    expect(result).toEqual(["lodash"]);
    expect(result).not.toContain("keyscope");
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
});
