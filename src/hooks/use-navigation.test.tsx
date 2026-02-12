import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, screen, act } from "@testing-library/react";
import { useRef, type ReactNode } from "react";
import { KeyboardProvider } from "../providers/keyboard-provider";
import { useNavigation, type UseNavigationOptions } from "./use-navigation";

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

// Test component for scoped mode
function TestList({
  items = ["a", "b", "c"],
  ...options
}: Partial<UseNavigationOptions> & { items?: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const result = useNavigation({
    containerRef: ref,
    role: "option",
    ...options,
  } as UseNavigationOptions);

  return (
    <div ref={ref} data-testid="list">
      {items.map((item) => (
        <div key={item} role="option" data-value={item} data-testid={`item-${item}`} />
      ))}
      <span data-testid="focused">{result.focusedValue ?? ""}</span>
    </div>
  );
}

// Test component for local mode
function LocalTestList({
  items = ["a", "b", "c"],
  ...options
}: Omit<Partial<UseNavigationOptions>, "mode"> & { items?: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const result = useNavigation({
    containerRef: ref,
    role: "option",
    mode: "local",
    ...options,
  });

  return (
    <div
      ref={ref}
      data-testid="list"
      onKeyDown={result.onKeyDown as unknown as React.KeyboardEventHandler}
    >
      {items.map((item) => (
        <div key={item} role="option" data-value={item} data-testid={`item-${item}`} />
      ))}
      <span data-testid="focused">{result.focusedValue ?? ""}</span>
    </div>
  );
}

function getFocused() {
  return screen.getByTestId("focused").textContent;
}

describe("useNavigation", () => {
  afterEach(() => {
    cleanup();
  });

  describe("scoped mode", () => {
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

    it("no wrap: ArrowDown at last calls onBoundaryReached('down')", () => {
      const onBoundaryReached = vi.fn();
      render(
        <TestList initialValue="c" wrap={false} onBoundaryReached={onBoundaryReached} />,
        { wrapper },
      );

      act(() => fireKey("ArrowDown"));
      expect(onBoundaryReached).toHaveBeenCalledWith("down");
      expect(getFocused()).toBe("c");
    });

    it("no wrap: ArrowUp at first calls onBoundaryReached('up')", () => {
      const onBoundaryReached = vi.fn();
      render(
        <TestList initialValue="a" wrap={false} onBoundaryReached={onBoundaryReached} />,
        { wrapper },
      );

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

    it("skips aria-disabled items", () => {
      function DisabledList() {
        const ref = useRef<HTMLDivElement>(null);
        const result = useNavigation({
          containerRef: ref,
          role: "option",
          initialValue: "a",
        });

        return (
          <div ref={ref} data-testid="list">
            <div role="option" data-value="a" />
            <div role="option" data-value="b" aria-disabled="true" />
            <div role="option" data-value="c" />
            <span data-testid="focused">{result.focusedValue ?? ""}</span>
          </div>
        );
      }

      render(<DisabledList />, { wrapper });

      act(() => fireKey("ArrowDown"));
      expect(getFocused()).toBe("c");
    });
  });

  describe("local mode", () => {
    function fireLocalKey(container: HTMLElement, key: string) {
      const event = new window.KeyboardEvent("keydown", {
        key,
        bubbles: true,
        cancelable: true,
      });
      container.dispatchEvent(event);
    }

    it("returns onKeyDown handler", () => {
      function CheckHandler() {
        const ref = useRef<HTMLDivElement>(null);
        const result = useNavigation({
          containerRef: ref,
          role: "option",
          mode: "local",
        });

        return (
          <div ref={ref}>
            <span data-testid="has-handler">{result.onKeyDown ? "yes" : "no"}</span>
          </div>
        );
      }

      render(<CheckHandler />, { wrapper });
      expect(screen.getByTestId("has-handler").textContent).toBe("yes");
    });

    it("arrow keys work via returned onKeyDown", () => {
      render(<LocalTestList initialValue="a" />, { wrapper });

      const container = screen.getByTestId("list");
      act(() => fireLocalKey(container, "ArrowDown"));
      expect(getFocused()).toBe("b");

      act(() => fireLocalKey(container, "ArrowUp"));
      expect(getFocused()).toBe("a");
    });

    it("Enter/Space work via onKeyDown", () => {
      const onSelect = vi.fn();
      const onEnter = vi.fn();
      render(<LocalTestList initialValue="b" onSelect={onSelect} onEnter={onEnter} />, { wrapper });

      const container = screen.getByTestId("list");
      act(() => fireLocalKey(container, " "));
      expect(onSelect).toHaveBeenCalledWith("b", expect.any(KeyboardEvent));

      act(() => fireLocalKey(container, "Enter"));
      expect(onEnter).toHaveBeenCalledWith("b", expect.any(KeyboardEvent));
    });

    it("enabled: false makes onKeyDown no-op", () => {
      const onSelect = vi.fn();
      render(<LocalTestList initialValue="a" enabled={false} onSelect={onSelect} />, { wrapper });

      const container = screen.getByTestId("list");
      act(() => fireLocalKey(container, "ArrowDown"));
      expect(getFocused()).toBe("a");

      act(() => fireLocalKey(container, " "));
      expect(onSelect).not.toHaveBeenCalled();
    });
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
});
