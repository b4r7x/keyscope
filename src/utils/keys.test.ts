import { describe, it, expect, vi } from "vitest";
import { keys } from "./keys";

describe("keys", () => {
  it("maps each key to the same handler", () => {
    const handler = vi.fn();
    const result = keys(["Enter", " "], handler);

    expect(result).toEqual({ Enter: handler, " ": handler });
  });

  it("returns an empty record for an empty array", () => {
    const handler = vi.fn();
    const result = keys([], handler);

    expect(result).toEqual({});
  });

  it("works with a single key", () => {
    const handler = vi.fn();
    const result = keys(["Escape"], handler);

    expect(result).toEqual({ Escape: handler });
  });
});
