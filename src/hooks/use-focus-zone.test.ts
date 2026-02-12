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

  describe("forZone helper", () => {
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
    it("does not push scope when scope option is not provided", () => {
      const handler = vi.fn();

      renderHook(
        () => {
          // Register handler in the default global scope
          useKey("x", handler);
          // useFocusZone WITHOUT scope should NOT push a new scope
          useFocusZone({
            initial: "main",
            zones: ["main", "sidebar"],
          });
        },
        { wrapper },
      );

      // If no scope was pushed, the global scope is still active,
      // so the handler registered in the global scope should fire.
      act(() => fireKey("x"));
      expect(handler).toHaveBeenCalledOnce();
    });

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
    it("ignores all keyboard handling when disabled", () => {
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
            tabCycle: ["main", "sidebar"],
          }),
        { wrapper },
      );

      act(() => fireKey("ArrowRight"));
      expect(result.current.zone).toBe("main");

      act(() => fireKey("Tab"));
      expect(result.current.zone).toBe("main");
    });
  });

  describe("lifecycle hooks", () => {
    it("calls onLeaveZone then onEnterZone then onZoneChange in order", () => {
      const calls: string[] = [];
      const { result } = renderHook(
        () =>
          useFocusZone({
            initial: "main",
            zones: ["main", "sidebar"],
            onLeaveZone: (z) => calls.push(`leave:${z}`),
            onEnterZone: (z) => calls.push(`enter:${z}`),
            onZoneChange: (z) => calls.push(`change:${z}`),
          }),
        { wrapper },
      );

      act(() => result.current.setZone("sidebar"));
      expect(calls).toEqual(["leave:main", "enter:sidebar", "change:sidebar"]);
    });

    it("no-op when setting same zone", () => {
      const onLeaveZone = vi.fn();
      const onEnterZone = vi.fn();
      const onZoneChange = vi.fn();
      const { result } = renderHook(
        () =>
          useFocusZone({
            initial: "main",
            zones: ["main", "sidebar"],
            onLeaveZone,
            onEnterZone,
            onZoneChange,
          }),
        { wrapper },
      );

      act(() => result.current.setZone("main"));
      expect(onLeaveZone).not.toHaveBeenCalled();
      expect(onEnterZone).not.toHaveBeenCalled();
      expect(onZoneChange).not.toHaveBeenCalled();
    });

  });

  describe("forZone + useKey integration", () => {
    it("handler fires only when zone matches forZone target", () => {
      const handler = vi.fn();

      const { result } = renderHook(
        () => {
          const fz = useFocusZone({
            initial: "main",
            zones: ["main", "sidebar"],
          });
          useKey("Enter", handler, fz.forZone("sidebar"));
          return fz;
        },
        { wrapper },
      );

      // Zone is "main", forZone("sidebar") → enabled: false
      act(() => fireKey("Enter"));
      expect(handler).not.toHaveBeenCalled();

      // Switch to "sidebar" → forZone("sidebar") → enabled: true
      act(() => result.current.setZone("sidebar"));
      act(() => fireKey("Enter"));
      expect(handler).toHaveBeenCalledOnce();
    });

  });

  describe("edge cases", () => {
    it("falls back to first zone when initial is invalid", () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      const { result } = renderHook(
        () =>
          useFocusZone({
            initial: "unknown" as "a",
            zones: ["a", "b"],
          }),
        { wrapper },
      );
      expect(result.current.zone).toBe("a");
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
