import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { KeyboardProvider } from "../providers/keyboard-provider";
import { useFocusZone } from "./use-focus-zone";
import { useKey } from "./use-key";

function wrapper({ children }: { children: ReactNode }) {
  return createElement(KeyboardProvider, null, children);
}

function fireKey(key: string, options?: Partial<KeyboardEvent>) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...options,
  });
  window.dispatchEvent(event);
  return event;
}

describe("useFocusZone", () => {
  afterEach(() => {
    cleanup();
  });

  describe("uncontrolled mode", () => {
    it("uses initial zone", () => {
      const { result } = renderHook(
        () => useFocusZone({ initial: "main", zones: ["main", "sidebar"] }),
        { wrapper },
      );

      expect(result.current.zone).toBe("main");
    });

    it("changes zone via setZone", () => {
      const { result } = renderHook(
        () => useFocusZone({ initial: "main", zones: ["main", "sidebar"] }),
        { wrapper },
      );

      act(() => result.current.setZone("sidebar"));
      expect(result.current.zone).toBe("sidebar");
    });

    it("calls onZoneChange when setZone is called", () => {
      const onZoneChange = vi.fn();
      const { result } = renderHook(
        () =>
          useFocusZone({
            initial: "main",
            zones: ["main", "sidebar"],
            onZoneChange,
          }),
        { wrapper },
      );

      act(() => result.current.setZone("sidebar"));
      expect(onZoneChange).toHaveBeenCalledWith("sidebar");
    });
  });

  describe("inZone helper", () => {
    it("returns true when current zone matches", () => {
      const { result } = renderHook(
        () =>
          useFocusZone({
            initial: "main",
            zones: ["main", "sidebar", "footer"],
          }),
        { wrapper },
      );

      expect(result.current.inZone("main")).toBe(true);
      expect(result.current.inZone("sidebar")).toBe(false);
    });

    it("accepts variadic args", () => {
      const { result } = renderHook(
        () =>
          useFocusZone({
            initial: "main",
            zones: ["main", "sidebar", "footer"],
          }),
        { wrapper },
      );

      expect(result.current.inZone("main", "footer")).toBe(true);
      expect(result.current.inZone("sidebar", "footer")).toBe(false);
    });
  });

  describe("forZone helper", () => {
    it("returns enabled: true when zone matches", () => {
      const { result } = renderHook(
        () => useFocusZone({ initial: "main", zones: ["main", "sidebar"] }),
        { wrapper },
      );

      expect(result.current.forZone("main")).toEqual({ enabled: true });
    });

    it("returns enabled: false when zone does not match", () => {
      const { result } = renderHook(
        () => useFocusZone({ initial: "main", zones: ["main", "sidebar"] }),
        { wrapper },
      );

      expect(result.current.forZone("sidebar")).toEqual({ enabled: false });
    });

    it("updates when zone changes", () => {
      const { result } = renderHook(
        () => useFocusZone({ initial: "main", zones: ["main", "sidebar"] }),
        { wrapper },
      );

      expect(result.current.forZone("sidebar")).toEqual({ enabled: false });

      act(() => result.current.setZone("sidebar"));

      expect(result.current.forZone("sidebar")).toEqual({ enabled: true });
      expect(result.current.forZone("main")).toEqual({ enabled: false });
    });

    it("merges extra options and ANDs enabled", () => {
      const { result } = renderHook(
        () => useFocusZone({ initial: "main", zones: ["main", "sidebar"] }),
        { wrapper },
      );

      expect(result.current.forZone("main", { allowInInput: true })).toEqual({
        allowInInput: true,
        enabled: true,
      });

      expect(
        result.current.forZone("main", { enabled: false, allowInInput: true }),
      ).toEqual({ allowInInput: true, enabled: false });

      expect(
        result.current.forZone("sidebar", { enabled: true }),
      ).toEqual({ enabled: false });
    });
  });

  describe("controlled mode", () => {
    it("uses zone prop instead of internal state", () => {
      const { result } = renderHook(
        () =>
          useFocusZone({
            initial: "main",
            zones: ["main", "sidebar"],
            zone: "sidebar",
          }),
        { wrapper },
      );

      expect(result.current.zone).toBe("sidebar");
    });

    it("calls onZoneChange but does not change zone internally", () => {
      const onZoneChange = vi.fn();
      const { result } = renderHook(
        () =>
          useFocusZone({
            initial: "main",
            zones: ["main", "sidebar"],
            zone: "sidebar",
            onZoneChange,
          }),
        { wrapper },
      );

      act(() => result.current.setZone("main"));
      expect(onZoneChange).toHaveBeenCalledWith("main");
      expect(result.current.zone).toBe("sidebar");
    });
  });

  describe("transitions", () => {
    it("changes zone on arrow key when transition returns new zone", () => {
      const { result } = renderHook(
        () =>
          useFocusZone({
            initial: "main",
            zones: ["main", "sidebar"],
            transitions: ({ zone, key }) => {
              if (zone === "main" && key === "ArrowRight") return "sidebar";
              if (zone === "sidebar" && key === "ArrowLeft") return "main";
              return null;
            },
          }),
        { wrapper },
      );

      act(() => fireKey("ArrowRight"));
      expect(result.current.zone).toBe("sidebar");

      act(() => fireKey("ArrowLeft"));
      expect(result.current.zone).toBe("main");
    });

    it("does not change zone when transition returns null", () => {
      const { result } = renderHook(
        () =>
          useFocusZone({
            initial: "main",
            zones: ["main", "sidebar"],
            transitions: () => null,
          }),
        { wrapper },
      );

      act(() => fireKey("ArrowUp"));
      expect(result.current.zone).toBe("main");
    });

    it("does not change zone when transition returns zone not in zones array", () => {
      const { result } = renderHook(
        () =>
          useFocusZone({
            initial: "main",
            zones: ["main", "sidebar"],
            transitions: () => "unknown" as "main",
          }),
        { wrapper },
      );

      act(() => fireKey("ArrowRight"));
      expect(result.current.zone).toBe("main");
    });

    it("calls onZoneChange on transition in controlled mode", () => {
      const onZoneChange = vi.fn();
      renderHook(
        () =>
          useFocusZone({
            initial: "main",
            zones: ["main", "sidebar"],
            zone: "main",
            onZoneChange,
            transitions: ({ key }) => {
              if (key === "ArrowRight") return "sidebar";
              return null;
            },
          }),
        { wrapper },
      );

      act(() => fireKey("ArrowRight"));
      expect(onZoneChange).toHaveBeenCalledWith("sidebar");
    });

    it("registers all arrow keys when transitions are present (no-ops for null transitions)", () => {
      const { result } = renderHook(
        () =>
          useFocusZone({
            initial: "main",
            zones: ["main", "sidebar"],
            transitions: ({ zone, key }) => {
              if (zone === "main" && key === "ArrowRight") return "sidebar";
              if (zone === "sidebar" && key === "ArrowLeft") return "main";
              return null;
            },
          }),
        { wrapper },
      );

      // ArrowUp has no valid transition — zone should stay the same
      act(() => fireKey("ArrowUp"));
      expect(result.current.zone).toBe("main");

      // ArrowRight has a valid transition — zone should change
      act(() => fireKey("ArrowRight"));
      expect(result.current.zone).toBe("sidebar");
    });
  });

  describe("tab cycling", () => {
    it("cycles through zones in order on Tab", () => {
      const { result } = renderHook(
        () =>
          useFocusZone({
            initial: "a",
            zones: ["a", "b", "c"],
            tabCycle: ["a", "b", "c"],
          }),
        { wrapper },
      );

      act(() => fireKey("Tab"));
      expect(result.current.zone).toBe("b");

      act(() => fireKey("Tab"));
      expect(result.current.zone).toBe("c");

      act(() => fireKey("Tab"));
      expect(result.current.zone).toBe("a");
    });

    it("cycles using tabCycle order, not zones order", () => {
      const { result } = renderHook(
        () =>
          useFocusZone({
            initial: "c",
            zones: ["a", "b", "c"],
            tabCycle: ["c", "a", "b"],
          }),
        { wrapper },
      );

      act(() => fireKey("Tab"));
      expect(result.current.zone).toBe("a");

      act(() => fireKey("Tab"));
      expect(result.current.zone).toBe("b");
    });

    it("cycles backwards on Shift+Tab", () => {
      const { result } = renderHook(
        () =>
          useFocusZone({
            initial: "c",
            zones: ["a", "b", "c"],
            tabCycle: ["a", "b", "c"],
          }),
        { wrapper },
      );

      act(() => fireKey("Tab", { shiftKey: true }));
      expect(result.current.zone).toBe("b");

      act(() => fireKey("Tab", { shiftKey: true }));
      expect(result.current.zone).toBe("a");

      act(() => fireKey("Tab", { shiftKey: true }));
      expect(result.current.zone).toBe("c");
    });
  });

  describe("scope integration", () => {
    it("isolates key handlers to the scope", () => {
      const outsideHandler = vi.fn();
      const insideHandler = vi.fn();

      renderHook(
        () => {
          useKey("Escape", outsideHandler);
          useFocusZone({
            initial: "main",
            zones: ["main"],
            scope: "review",
          });
          // This handler is in "review" scope pushed by useFocusZone
          useKey("Escape", insideHandler);
        },
        { wrapper },
      );

      // When scope is active, only the scoped handler should fire.
      // The provider only dispatches to the active scope.
      act(() => fireKey("Escape"));
      // The "review" scope is the active scope (pushed last), so the
      // Escape handler registered after the scope push fires.
      expect(insideHandler).toHaveBeenCalledOnce();
    });
  });

  describe("enabled flag", () => {
    it("does not respond to transitions when disabled", () => {
      const { result } = renderHook(
        () =>
          useFocusZone({
            initial: "main",
            zones: ["main", "sidebar"],
            enabled: false,
            transitions: ({ key }) => {
              if (key === "ArrowRight") return "sidebar";
              return null;
            },
          }),
        { wrapper },
      );

      act(() => fireKey("ArrowRight"));
      expect(result.current.zone).toBe("main");
    });

    it("does not respond to tab cycling when disabled", () => {
      const { result } = renderHook(
        () =>
          useFocusZone({
            initial: "a",
            zones: ["a", "b"],
            enabled: false,
            tabCycle: ["a", "b"],
          }),
        { wrapper },
      );

      act(() => fireKey("Tab"));
      expect(result.current.zone).toBe("a");
    });
  });

  describe("edge cases", () => {
    it("throws when initial zone is not in zones", () => {
      expect(() => {
        renderHook(
          () =>
            useFocusZone({
              initial: "unknown" as "a",
              zones: ["a", "b"],
            }),
          { wrapper },
        );
      }).toThrow(
        '[keyscope] useFocusZone: initial zone "unknown" is not in zones [a, b]',
      );
    });

    it("works with a single zone", () => {
      const { result } = renderHook(
        () =>
          useFocusZone({
            initial: "only",
            zones: ["only"],
            tabCycle: ["only"],
          }),
        { wrapper },
      );

      act(() => fireKey("Tab"));
      expect(result.current.zone).toBe("only");
    });
  });
});
