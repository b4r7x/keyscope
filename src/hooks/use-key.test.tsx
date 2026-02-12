import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, cleanup } from "@testing-library/react";
import { type ReactNode } from "react";
import { KeyboardProvider } from "../providers/keyboard-provider";
import { useKey } from "./use-key";

function wrapper({ children }: { children: ReactNode }) {
  return <KeyboardProvider>{children}</KeyboardProvider>;
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

describe("useKey", () => {
  afterEach(() => {
    cleanup();
  });

  describe("overload 1: single key + handler", () => {
    it("registers a single key and calls handler", () => {
      const handler = vi.fn();
      renderHook(() => useKey("Escape", handler), { wrapper });

      fireKey("Escape");
      expect(handler).toHaveBeenCalledOnce();
    });

    it("passes KeyboardEvent to handler", () => {
      const handler = vi.fn();
      renderHook(() => useKey("Escape", handler), { wrapper });

      fireKey("Escape");
      expect(handler).toHaveBeenCalledWith(expect.any(KeyboardEvent));
    });

    it("does not call handler for non-matching key", () => {
      const handler = vi.fn();
      renderHook(() => useKey("Escape", handler), { wrapper });

      fireKey("Enter");
      expect(handler).not.toHaveBeenCalled();
    });

    it("respects enabled: false", () => {
      const handler = vi.fn();
      renderHook(() => useKey("Escape", handler, { enabled: false }), {
        wrapper,
      });

      fireKey("Escape");
      expect(handler).not.toHaveBeenCalled();
    });

    it("re-enables when enabled changes to true", () => {
      const handler = vi.fn();
      let enabled = false;
      const { rerender } = renderHook(
        () => useKey("Escape", handler, { enabled }),
        { wrapper },
      );

      fireKey("Escape");
      expect(handler).not.toHaveBeenCalled();

      enabled = true;
      rerender();

      fireKey("Escape");
      expect(handler).toHaveBeenCalledOnce();
    });

    it("cleans up on unmount", () => {
      const handler = vi.fn();
      const { unmount } = renderHook(() => useKey("Escape", handler), {
        wrapper,
      });

      unmount();
      fireKey("Escape");
      expect(handler).not.toHaveBeenCalled();
    });

    it("supports modifier keys", () => {
      const handler = vi.fn();
      renderHook(() => useKey("ctrl+s", handler), { wrapper });

      fireKey("s", { ctrlKey: true });
      expect(handler).toHaveBeenCalledOnce();

      fireKey("s");
      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe("overload 2: array of keys + handler", () => {
    it("registers multiple keys with same handler", () => {
      const handler = vi.fn();
      renderHook(() => useKey(["Enter", " "], handler), { wrapper });

      fireKey("Enter");
      expect(handler).toHaveBeenCalledOnce();

      fireKey(" ");
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it("passes KeyboardEvent to handler for each key", () => {
      const handler = vi.fn();
      renderHook(() => useKey(["ArrowUp", "ArrowDown"], handler), { wrapper });

      fireKey("ArrowUp");
      expect(handler).toHaveBeenCalledWith(expect.any(KeyboardEvent));
    });

    it("does not fire for non-matching keys", () => {
      const handler = vi.fn();
      renderHook(() => useKey(["Enter", " "], handler), { wrapper });

      fireKey("Escape");
      expect(handler).not.toHaveBeenCalled();
    });

    it("respects enabled: false", () => {
      const handler = vi.fn();
      renderHook(() => useKey(["Enter", " "], handler, { enabled: false }), {
        wrapper,
      });

      fireKey("Enter");
      fireKey(" ");
      expect(handler).not.toHaveBeenCalled();
    });

    it("cleans up on unmount", () => {
      const handler = vi.fn();
      const { unmount } = renderHook(
        () => useKey(["Enter", " "], handler),
        { wrapper },
      );

      unmount();
      fireKey("Enter");
      fireKey(" ");
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("overload 3: key map", () => {
    it("calls correct handler per key", () => {
      const moveUp = vi.fn();
      const moveDown = vi.fn();
      renderHook(
        () =>
          useKey({
            ArrowUp: moveUp,
            ArrowDown: moveDown,
          }),
        { wrapper },
      );

      fireKey("ArrowUp");
      expect(moveUp).toHaveBeenCalledOnce();
      expect(moveDown).not.toHaveBeenCalled();

      fireKey("ArrowDown");
      expect(moveDown).toHaveBeenCalledOnce();
    });

    it("passes KeyboardEvent to each handler", () => {
      const moveUp = vi.fn();
      const moveDown = vi.fn();
      renderHook(
        () =>
          useKey({
            ArrowUp: moveUp,
            ArrowDown: moveDown,
          }),
        { wrapper },
      );

      fireKey("ArrowUp");
      expect(moveUp).toHaveBeenCalledWith(expect.any(KeyboardEvent));

      fireKey("ArrowDown");
      expect(moveDown).toHaveBeenCalledWith(expect.any(KeyboardEvent));
    });

    it("does not fire for non-matching keys", () => {
      const moveUp = vi.fn();
      renderHook(() => useKey({ ArrowUp: moveUp }), { wrapper });

      fireKey("Enter");
      expect(moveUp).not.toHaveBeenCalled();
    });

    it("respects enabled: false", () => {
      const moveUp = vi.fn();
      const moveDown = vi.fn();
      renderHook(
        () =>
          useKey(
            { ArrowUp: moveUp, ArrowDown: moveDown },
            { enabled: false },
          ),
        { wrapper },
      );

      fireKey("ArrowUp");
      fireKey("ArrowDown");
      expect(moveUp).not.toHaveBeenCalled();
      expect(moveDown).not.toHaveBeenCalled();
    });

    it("cleans up on unmount", () => {
      const moveUp = vi.fn();
      const moveDown = vi.fn();
      const { unmount } = renderHook(
        () =>
          useKey({
            ArrowUp: moveUp,
            ArrowDown: moveDown,
          }),
        { wrapper },
      );

      unmount();
      fireKey("ArrowUp");
      fireKey("ArrowDown");
      expect(moveUp).not.toHaveBeenCalled();
      expect(moveDown).not.toHaveBeenCalled();
    });

    it("conditionally enables based on zone equality", () => {
      const handler = vi.fn();
      let zone = "search";
      const { rerender } = renderHook(
        () =>
          useKey(
            { ArrowDown: handler },
            { enabled: zone === "list" },
          ),
        { wrapper },
      );

      fireKey("ArrowDown");
      expect(handler).not.toHaveBeenCalled();

      zone = "list";
      rerender();

      fireKey("ArrowDown");
      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe("handler stability", () => {
    it("picks up latest handler without re-registration", () => {
      let callCount = 0;
      const firstHandler = vi.fn(() => (callCount = 1));
      const secondHandler = vi.fn(() => (callCount = 2));

      let handler = firstHandler;
      const { rerender } = renderHook(
        () => useKey("Escape", handler),
        { wrapper },
      );

      fireKey("Escape");
      expect(firstHandler).toHaveBeenCalledOnce();
      expect(callCount).toBe(1);

      // Swap handler and rerender — useEffectEvent should pick up the new one
      handler = secondHandler;
      rerender();

      fireKey("Escape");
      expect(secondHandler).toHaveBeenCalledOnce();
      expect(callCount).toBe(2);
      // First handler should not have been called again
      expect(firstHandler).toHaveBeenCalledOnce();
    });
  });

  describe("options", () => {
    it("passes preventDefault to provider", () => {
      const handler = vi.fn();
      renderHook(
        () => useKey("Escape", handler, { preventDefault: true }),
        { wrapper },
      );

      const event = fireKey("Escape");
      expect(event.defaultPrevented).toBe(true);
    });

    it("does not preventDefault by default", () => {
      const handler = vi.fn();
      renderHook(() => useKey("Escape", handler), { wrapper });

      const event = fireKey("Escape");
      expect(event.defaultPrevented).toBe(false);
    });
  });
});
