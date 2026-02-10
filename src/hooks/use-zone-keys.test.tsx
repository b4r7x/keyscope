import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act, cleanup } from "@testing-library/react";
import { useState, type ReactNode } from "react";
import { KeyboardProvider } from "../providers/keyboard-provider";
import { useZoneKeys } from "./use-zone-keys";

function Wrapper({ children }: { children: ReactNode }) {
  return <KeyboardProvider>{children}</KeyboardProvider>;
}

function pressKey(key: string, target: EventTarget = window) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
}

describe("useZoneKeys", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("fires handler when zone matches", () => {
    const handler = vi.fn();

    function Consumer() {
      useZoneKeys("main", "main", { Enter: handler });
      return <div>consumer</div>;
    }

    render(
      <Wrapper>
        <Consumer />
      </Wrapper>,
    );

    act(() => pressKey("Enter"));
    expect(handler).toHaveBeenCalledOnce();
  });

  it("does not fire when zone doesn't match", () => {
    const handler = vi.fn();

    function Consumer() {
      useZoneKeys("sidebar", "main", { Enter: handler });
      return <div>consumer</div>;
    }

    render(
      <Wrapper>
        <Consumer />
      </Wrapper>,
    );

    act(() => pressKey("Enter"));
    expect(handler).not.toHaveBeenCalled();
  });

  it("respects enabled: false", () => {
    const handler = vi.fn();

    function Consumer() {
      useZoneKeys("main", "main", { Enter: handler }, { enabled: false });
      return <div>consumer</div>;
    }

    render(
      <Wrapper>
        <Consumer />
      </Wrapper>,
    );

    act(() => pressKey("Enter"));
    expect(handler).not.toHaveBeenCalled();
  });

  it("re-registers when key set changes", () => {
    const enterHandler = vi.fn();
    const escapeHandler = vi.fn();

    function Consumer({ useEscape }: { useEscape: boolean }) {
      const handlers = useEscape ? { Escape: escapeHandler } : { Enter: enterHandler };
      useZoneKeys("main", "main", handlers);
      return <div>consumer</div>;
    }

    const { rerender } = render(
      <Wrapper>
        <Consumer useEscape={false} />
      </Wrapper>,
    );

    act(() => pressKey("Enter"));
    expect(enterHandler).toHaveBeenCalledOnce();

    rerender(
      <Wrapper>
        <Consumer useEscape={true} />
      </Wrapper>,
    );

    act(() => pressKey("Enter"));
    expect(enterHandler).toHaveBeenCalledOnce(); // still 1

    act(() => pressKey("Escape"));
    expect(escapeHandler).toHaveBeenCalledOnce();
  });

  it("calls latest handler (useEffectEvent stability)", () => {
    let callCount = 0;

    function Consumer({ value }: { value: string }) {
      const handler = () => {
        callCount += 1;
        // The handler should capture the latest value
        if (value !== "updated") throw new Error("stale closure");
      };
      useZoneKeys("main", "main", { Enter: handler });
      return <div>consumer</div>;
    }

    const { rerender } = render(
      <Wrapper>
        <Consumer value="initial" />
      </Wrapper>,
    );

    rerender(
      <Wrapper>
        <Consumer value="updated" />
      </Wrapper>,
    );

    act(() => pressKey("Enter"));
    expect(callCount).toBe(1);
  });

  it("supports allowInInput passthrough", () => {
    const handler = vi.fn();

    function Consumer() {
      useZoneKeys("main", "main", { Escape: handler }, { allowInInput: true });
      return <input data-testid="input" />;
    }

    const { container } = render(
      <Wrapper>
        <Consumer />
      </Wrapper>,
    );

    const input = container.querySelector("input")!;
    act(() => {
      const event = new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      });
      input.dispatchEvent(event);
    });

    expect(handler).toHaveBeenCalledOnce();
  });

  it("cleans up on unmount", () => {
    const handler = vi.fn();

    function Consumer() {
      useZoneKeys("main", "main", { Enter: handler });
      return <div>consumer</div>;
    }

    function App({ show }: { show: boolean }) {
      return <Wrapper>{show ? <Consumer /> : null}</Wrapper>;
    }

    const { rerender } = render(<App show={true} />);

    act(() => pressKey("Enter"));
    expect(handler).toHaveBeenCalledOnce();

    rerender(<App show={false} />);

    act(() => pressKey("Enter"));
    expect(handler).toHaveBeenCalledOnce(); // still 1
  });

  it("cleans up when zone changes away", () => {
    const handler = vi.fn();

    function Consumer({ zone }: { zone: string }) {
      useZoneKeys(zone, "main", { Enter: handler });
      return <div>consumer</div>;
    }

    const { rerender } = render(
      <Wrapper>
        <Consumer zone="main" />
      </Wrapper>,
    );

    act(() => pressKey("Enter"));
    expect(handler).toHaveBeenCalledOnce();

    rerender(
      <Wrapper>
        <Consumer zone="sidebar" />
      </Wrapper>,
    );

    act(() => pressKey("Enter"));
    expect(handler).toHaveBeenCalledOnce(); // still 1
  });

  it('pipe syntax: "Enter | Space" registers both keys', () => {
    const handler = vi.fn();

    function Consumer() {
      useZoneKeys("main", "main", { "Enter | Space": handler });
      return <div>consumer</div>;
    }

    render(
      <Wrapper>
        <Consumer />
      </Wrapper>,
    );

    act(() => pressKey("Enter"));
    expect(handler).toHaveBeenCalledTimes(1);

    act(() => pressKey(" "));
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("pipe syntax: both keys call same handler", () => {
    const results: string[] = [];

    function Consumer() {
      useZoneKeys("main", "main", {
        "Enter | Space": () => results.push("activated"),
      });
      return <div>consumer</div>;
    }

    render(
      <Wrapper>
        <Consumer />
      </Wrapper>,
    );

    act(() => pressKey("Enter"));
    act(() => pressKey(" "));

    expect(results).toEqual(["activated", "activated"]);
  });
});
