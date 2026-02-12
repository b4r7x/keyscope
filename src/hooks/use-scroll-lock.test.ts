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
});
