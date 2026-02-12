import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { useEffect, type ReactNode } from "react";
import { KeyboardProvider } from "../providers/keyboard-provider";
import { useKeyboardContext } from "../context/keyboard-context";
import { useScope } from "./use-scope";
import { renderHook } from "@testing-library/react";

function Wrapper({ children }: { children: ReactNode }) {
  return <KeyboardProvider>{children}</KeyboardProvider>;
}

function pressKey(key: string) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
  });
  window.dispatchEvent(event);
  return event;
}

describe("useScope", () => {
  afterEach(() => {
    cleanup();
  });

  it("pushes scope so only that scope's handlers fire", () => {
    const globalHandler = vi.fn();
    const modalHandler = vi.fn();

    function Consumer() {
      const { register } = useKeyboardContext();
      useScope("modal");
      useEffect(() => {
        register("global", "Escape", globalHandler);
        register("modal", "Escape", modalHandler);
      }, []);
      return <div>consumer</div>;
    }

    render(
      <Wrapper>
        <Consumer />
      </Wrapper>,
    );

    act(() => pressKey("Escape"));
    expect(modalHandler).toHaveBeenCalledOnce();
    expect(globalHandler).not.toHaveBeenCalled();
  });

  it("pops scope on unmount so previous scope is active", () => {
    const globalHandler = vi.fn();
    const modalHandler = vi.fn();
    function GlobalConsumer() {
      const { register } = useKeyboardContext();
      useEffect(() => register("global", "Escape", globalHandler), []);
      return null;
    }

    function ModalConsumer() {
      const { register } = useKeyboardContext();
      useScope("modal");
      useEffect(() => register("modal", "Escape", modalHandler), []);
      return null;
    }

    const { rerender } = render(
      <Wrapper>
        <GlobalConsumer />
        <ModalConsumer />
      </Wrapper>,
    );

    act(() => pressKey("Escape"));
    expect(modalHandler).toHaveBeenCalledOnce();
    expect(globalHandler).not.toHaveBeenCalled();

    // Unmount the modal consumer — useScope cleanup pops "modal"
    rerender(
      <Wrapper>
        <GlobalConsumer />
      </Wrapper>,
    );

    act(() => pressKey("Escape"));
    expect(globalHandler).toHaveBeenCalledOnce();
  });

  it("does not push scope when enabled is false", () => {
    const globalHandler = vi.fn();
    const modalHandler = vi.fn();

    function Consumer() {
      const { register } = useKeyboardContext();
      useScope("modal", { enabled: false });
      useEffect(() => {
        register("global", "Escape", globalHandler);
        register("modal", "Escape", modalHandler);
      }, []);
      return <div>consumer</div>;
    }

    render(
      <Wrapper>
        <Consumer />
      </Wrapper>,
    );

    act(() => pressKey("Escape"));
    // Scope was not pushed, so active scope is still "global"
    expect(globalHandler).toHaveBeenCalledOnce();
    expect(modalHandler).not.toHaveBeenCalled();
  });

  it("throws when used outside KeyboardProvider", () => {
    expect(() => {
      renderHook(() => useScope("modal"));
    }).toThrow("useKeyboardContext must be used within KeyboardProvider");
  });
});
