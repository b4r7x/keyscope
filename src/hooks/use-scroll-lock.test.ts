import { describe, it, expect, afterEach } from "vitest";
import { renderHook, cleanup } from "@testing-library/react";
import { useRef } from "react";
import { useScrollLock } from "./use-scroll-lock";

describe("useScrollLock", () => {
  afterEach(() => {
    cleanup();
    document.body.style.overflow = "";
  });

  it("sets overflow hidden on body when enabled", () => {
    renderHook(() => useScrollLock());

    expect(document.body.style.overflow).toBe("hidden");
  });

  it("restores original overflow value on unmount", () => {
    document.body.style.overflow = "auto";

    const { unmount } = renderHook(() => useScrollLock());
    expect(document.body.style.overflow).toBe("hidden");

    unmount();
    expect(document.body.style.overflow).toBe("auto");
  });

  it("does nothing when enabled is false", () => {
    document.body.style.overflow = "scroll";

    renderHook(() => useScrollLock(undefined, false));

    expect(document.body.style.overflow).toBe("scroll");
  });

  it("keeps scroll locked until all concurrent locks unmount", () => {
    const { unmount: unmount1 } = renderHook(() => useScrollLock());
    const { unmount: unmount2 } = renderHook(() => useScrollLock());

    expect(document.body.style.overflow).toBe("hidden");

    // First lock unmounts — second still holds the lock
    unmount1();
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("works with a custom target ref", () => {
    const container = document.createElement("div");
    container.style.overflow = "auto";
    document.body.appendChild(container);

    const { unmount } = renderHook(() => {
      const ref = useRef<HTMLElement>(container);
      useScrollLock(ref);
    });

    expect(container.style.overflow).toBe("hidden");

    unmount();
    expect(container.style.overflow).toBe("auto");

    container.remove();
  });

  it("handles multiple lock/unlock cycles on same element", () => {
    document.body.style.overflow = "auto";

    const { unmount: u1 } = renderHook(() => useScrollLock());
    expect(document.body.style.overflow).toBe("hidden");
    u1();
    expect(document.body.style.overflow).toBe("auto");

    const { unmount: u2 } = renderHook(() => useScrollLock());
    expect(document.body.style.overflow).toBe("hidden");
    u2();
    expect(document.body.style.overflow).toBe("auto");
  });

  it("restores correctly when second component unmounts before first", () => {
    const { unmount: unmount1 } = renderHook(() => useScrollLock());
    const { unmount: unmount2 } = renderHook(() => useScrollLock());

    expect(document.body.style.overflow).toBe("hidden");

    unmount2();
    expect(document.body.style.overflow).toBe("hidden");

    unmount1();
    expect(document.body.style.overflow).toBe("");
  });

  it("re-enables after toggling enabled true→false→true", () => {
    const { rerender } = renderHook(
      ({ enabled }) => useScrollLock(undefined, enabled),
      { initialProps: { enabled: true } },
    );
    expect(document.body.style.overflow).toBe("hidden");

    rerender({ enabled: false });
    expect(document.body.style.overflow).toBe("");

    rerender({ enabled: true });
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("locks element when target ref is provided after initial undefined", () => {
    const container = document.createElement("div");
    container.style.overflow = "auto";
    document.body.appendChild(container);

    // First render: no target → locks body
    const { unmount } = renderHook(() => useScrollLock());
    expect(document.body.style.overflow).toBe("hidden");
    unmount();

    // Second render: target ref → locks container
    const { unmount: unmount2 } = renderHook(() => {
      const ref = useRef<HTMLElement>(container);
      useScrollLock(ref);
    });
    expect(container.style.overflow).toBe("hidden");

    unmount2();
    expect(container.style.overflow).toBe("auto");

    container.remove();
  });
});
