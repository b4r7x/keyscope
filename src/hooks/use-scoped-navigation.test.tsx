import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, screen, act } from "@testing-library/react";
import { useRef, type ReactNode } from "react";
import { KeyboardProvider } from "../providers/keyboard-provider";
import { useScopedNavigation, type UseScopedNavigationOptions } from "./use-scoped-navigation";

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

  it("ArrowDown moves to next item", () => {
    render(<TestList initialValue="a" />, { wrapper });

    act(() => fireKey("ArrowDown"));
    expect(getFocused()).toBe("b");
  });

  it("ArrowUp moves to previous item", () => {
    render(<TestList initialValue="b" />, { wrapper });

    act(() => fireKey("ArrowUp"));
    expect(getFocused()).toBe("a");
  });

  it("ArrowDown at last wraps to first", () => {
    render(<TestList initialValue="c" />, { wrapper });

    act(() => fireKey("ArrowDown"));
    expect(getFocused()).toBe("a");
  });

  it("ArrowUp at first wraps to last", () => {
    render(<TestList initialValue="a" />, { wrapper });

    act(() => fireKey("ArrowUp"));
    expect(getFocused()).toBe("c");
  });

  it("no wrap: calls onBoundaryReached at both boundaries", () => {
    const onBoundaryReached = vi.fn();
    render(
      <TestList initialValue="c" wrap={false} onBoundaryReached={onBoundaryReached} />,
      { wrapper },
    );

    act(() => fireKey("ArrowDown"));
    expect(onBoundaryReached).toHaveBeenCalledWith("down");
    expect(getFocused()).toBe("c");

    act(() => fireKey("ArrowUp"));
    act(() => fireKey("ArrowUp"));
    act(() => fireKey("ArrowUp"));
    expect(onBoundaryReached).toHaveBeenCalledWith("up");
    expect(getFocused()).toBe("a");
  });

  it("Home focuses first item", () => {
    render(<TestList initialValue="c" />, { wrapper });

    act(() => fireKey("Home"));
    expect(getFocused()).toBe("a");
  });

  it("End focuses last item", () => {
    render(<TestList initialValue="a" />, { wrapper });

    act(() => fireKey("End"));
    expect(getFocused()).toBe("c");
  });

  it("Space calls onSelect with focused value", () => {
    const onSelect = vi.fn();
    render(<TestList initialValue="b" onSelect={onSelect} />, { wrapper });

    act(() => fireKey(" "));
    expect(onSelect).toHaveBeenCalledWith("b", expect.any(KeyboardEvent));
  });

  it("Enter calls onEnter when provided", () => {
    const onEnter = vi.fn();
    const onSelect = vi.fn();
    render(
      <TestList initialValue="b" onEnter={onEnter} onSelect={onSelect} />,
      { wrapper },
    );

    act(() => fireKey("Enter"));
    expect(onEnter).toHaveBeenCalledWith("b", expect.any(KeyboardEvent));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("Enter falls back to onSelect when onEnter not provided", () => {
    const onSelect = vi.fn();
    render(<TestList initialValue="b" onSelect={onSelect} />, { wrapper });

    act(() => fireKey("Enter"));
    expect(onSelect).toHaveBeenCalledWith("b", expect.any(KeyboardEvent));
  });

  it("enabled: false disables all handlers", () => {
    const onSelect = vi.fn();
    render(
      <TestList initialValue="a" enabled={false} onSelect={onSelect} />,
      { wrapper },
    );

    act(() => fireKey("ArrowDown"));
    expect(getFocused()).toBe("a");

    act(() => fireKey(" "));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("custom upKeys/downKeys", () => {
    render(
      <TestList initialValue="a" upKeys={["ArrowUp", "k"]} downKeys={["ArrowDown", "j"]} />,
      { wrapper },
    );

    act(() => fireKey("j"));
    expect(getFocused()).toBe("b");

    act(() => fireKey("k"));
    expect(getFocused()).toBe("a");
  });

  it("fires onHighlightChange when focus moves", () => {
    const onHighlightChange = vi.fn();
    render(<TestList initialValue="a" onHighlightChange={onHighlightChange} />, { wrapper });

    act(() => fireKey("ArrowDown"));
    expect(onHighlightChange).toHaveBeenCalledWith("b");
  });

  describe("controlled mode", () => {
    it("value prop sets focused value", () => {
      render(<TestList value="b" />, { wrapper });
      expect(getFocused()).toBe("b");
    });

    it("onValueChange called on navigation", () => {
      const onValueChange = vi.fn();
      render(<TestList value="a" onValueChange={onValueChange} />, { wrapper });

      act(() => fireKey("ArrowDown"));
      expect(onValueChange).toHaveBeenCalledWith("b");
    });
  });

  describe("horizontal orientation", () => {
    it("ArrowRight moves to next item", () => {
      render(<TestList initialValue="a" orientation="horizontal" />, { wrapper });

      act(() => fireKey("ArrowRight"));
      expect(getFocused()).toBe("b");
    });

    it("ArrowLeft moves to previous item", () => {
      render(<TestList initialValue="b" orientation="horizontal" />, { wrapper });

      act(() => fireKey("ArrowLeft"));
      expect(getFocused()).toBe("a");
    });
  });

  describe("skipDisabled", () => {
    function SkipDisabledList({ skipDisabled }: { skipDisabled?: boolean }) {
      const ref = useRef<HTMLDivElement>(null);
      const result = useScopedNavigation({
        containerRef: ref,
        role: "option",
        initialValue: "a",
        skipDisabled,
      });

      return (
        <div ref={ref} data-testid="list">
          <div role="option" data-value="a" />
          <div role="option" data-value="b" aria-disabled="true" />
          <div role="option" data-value="c" />
          <span data-testid="focused">{result.highlighted ?? ""}</span>
        </div>
      );
    }

    it("skips disabled items by default", () => {
      render(<SkipDisabledList />, { wrapper });

      act(() => fireKey("ArrowDown"));
      expect(getFocused()).toBe("c");
    });

    it("includes disabled items when skipDisabled is false", () => {
      render(<SkipDisabledList skipDisabled={false} />, { wrapper });

      act(() => fireKey("ArrowDown"));
      expect(getFocused()).toBe("b");
    });
  });
});
