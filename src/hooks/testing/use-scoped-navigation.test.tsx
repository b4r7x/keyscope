import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, screen, act } from "@testing-library/react";
import { useRef, type ReactNode } from "react";
import { KeyboardProvider } from "../../providers/keyboard-provider";
import { useScopedNavigation, type UseScopedNavigationOptions } from "../use-scoped-navigation";
import { useScope } from "../use-scope";

function wrapper({ children }: { children: ReactNode }) {
  return <KeyboardProvider>{children}</KeyboardProvider>;
}

function fireKey(key: string) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
  });
  window.dispatchEvent(event);
  return event;
}

function TestList({
  items = ["a", "b", "c"],
  ...options
}: Partial<UseScopedNavigationOptions> & { items?: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const result = useScopedNavigation({
    containerRef: ref,
    role: "option",
    ...options,
  });

  return (
    <div ref={ref} data-testid="list">
      {items.map((item) => (
        <div key={item} role="option" data-value={item} data-testid={`item-${item}`} />
      ))}
      <span data-testid="focused">{result.highlighted ?? ""}</span>
    </div>
  );
}

function getFocused() {
  return screen.getByTestId("focused").textContent;
}

describe("useScopedNavigation", () => {
  afterEach(() => {
    cleanup();
  });

  it("navigates via KeyboardProvider (arrows, wrap, Home, End)", () => {
    render(<TestList initialValue="a" />, { wrapper });

    act(() => fireKey("ArrowDown"));
    expect(getFocused()).toBe("b");

    act(() => fireKey("ArrowDown"));
    act(() => fireKey("ArrowDown"));
    expect(getFocused()).toBe("a");

    act(() => fireKey("End"));
    expect(getFocused()).toBe("c");

    act(() => fireKey("Home"));
    expect(getFocused()).toBe("a");
  });

  it("Space calls onSelect, Enter calls onEnter", () => {
    const onSelect = vi.fn();
    const onEnter = vi.fn();
    render(
      <TestList initialValue="b" onSelect={onSelect} onEnter={onEnter} />,
      { wrapper },
    );

    act(() => fireKey(" "));
    expect(onSelect).toHaveBeenCalledWith("b", expect.any(KeyboardEvent));

    act(() => fireKey("Enter"));
    expect(onEnter).toHaveBeenCalledWith("b", expect.any(KeyboardEvent));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("enabled: false disables all handlers", () => {
    render(<TestList initialValue="a" enabled={false} />, { wrapper });

    act(() => fireKey("ArrowDown"));
    expect(getFocused()).toBe("a");
  });

  it("controlled mode: value + onValueChange", () => {
    const onValueChange = vi.fn();
    render(<TestList value="a" onValueChange={onValueChange} />, { wrapper });

    expect(getFocused()).toBe("a");
    act(() => fireKey("ArrowDown"));
    expect(onValueChange).toHaveBeenCalledWith("b");
  });

});
