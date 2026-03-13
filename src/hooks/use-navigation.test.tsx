import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, screen, act } from "@testing-library/react";
import { useRef } from "react";
import { useNavigation, type UseNavigationOptions } from "./use-navigation";

function TestList({
  items = ["a", "b", "c"],
  ...options
}: Partial<UseNavigationOptions> & { items?: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const result = useNavigation({
    containerRef: ref,
    role: "option",
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
      <span data-testid="focused">{result.highlighted ?? ""}</span>
    </div>
  );
}

function fireKeyOnElement(container: HTMLElement, key: string) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
  });
  container.dispatchEvent(event);
}

function getFocused() {
  return screen.getByTestId("focused").textContent;
}

describe("useNavigation", () => {
  afterEach(() => {
    cleanup();
  });

  describe("basic navigation", () => {
    it("ArrowDown moves to next item", () => {
      render(<TestList initialValue="a" />);

      const container = screen.getByTestId("list");
      act(() => fireKeyOnElement(container, "ArrowDown"));
      expect(getFocused()).toBe("b");
    });

    it("ArrowUp moves to previous item", () => {
      render(<TestList initialValue="b" />);

      const container = screen.getByTestId("list");
      act(() => fireKeyOnElement(container, "ArrowUp"));
      expect(getFocused()).toBe("a");
    });

    it("ArrowDown at last wraps to first", () => {
      render(<TestList initialValue="c" />);

      const container = screen.getByTestId("list");
      act(() => fireKeyOnElement(container, "ArrowDown"));
      expect(getFocused()).toBe("a");
    });

    it("ArrowUp at first wraps to last", () => {
      render(<TestList initialValue="a" />);

      const container = screen.getByTestId("list");
      act(() => fireKeyOnElement(container, "ArrowUp"));
      expect(getFocused()).toBe("c");
    });

    it("no wrap: calls onBoundaryReached at both boundaries", () => {
      const onBoundaryReached = vi.fn();
      render(
        <TestList initialValue="c" wrap={false} onBoundaryReached={onBoundaryReached} />,
      );

      const container = screen.getByTestId("list");
      act(() => fireKeyOnElement(container, "ArrowDown"));
      expect(onBoundaryReached).toHaveBeenCalledWith("down");
      expect(getFocused()).toBe("c");

      act(() => fireKeyOnElement(container, "ArrowUp"));
      act(() => fireKeyOnElement(container, "ArrowUp"));
      act(() => fireKeyOnElement(container, "ArrowUp"));
      expect(onBoundaryReached).toHaveBeenCalledWith("up");
      expect(getFocused()).toBe("a");
    });

    it("Home focuses first item", () => {
      render(<TestList initialValue="c" />);

      const container = screen.getByTestId("list");
      act(() => fireKeyOnElement(container, "Home"));
      expect(getFocused()).toBe("a");
    });

    it("End focuses last item", () => {
      render(<TestList initialValue="a" />);

      const container = screen.getByTestId("list");
      act(() => fireKeyOnElement(container, "End"));
      expect(getFocused()).toBe("c");
    });

    it("Space calls onSelect with focused value", () => {
      const onSelect = vi.fn();
      render(<TestList initialValue="b" onSelect={onSelect} />);

      const container = screen.getByTestId("list");
      act(() => fireKeyOnElement(container, " "));
      expect(onSelect).toHaveBeenCalledWith("b", expect.any(KeyboardEvent));
    });

    it("Enter calls onEnter when provided", () => {
      const onEnter = vi.fn();
      const onSelect = vi.fn();
      render(
        <TestList initialValue="b" onEnter={onEnter} onSelect={onSelect} />,
      );

      const container = screen.getByTestId("list");
      act(() => fireKeyOnElement(container, "Enter"));
      expect(onEnter).toHaveBeenCalledWith("b", expect.any(KeyboardEvent));
      expect(onSelect).not.toHaveBeenCalled();
    });

    it("Enter falls back to onSelect when onEnter not provided", () => {
      const onSelect = vi.fn();
      render(<TestList initialValue="b" onSelect={onSelect} />);

      const container = screen.getByTestId("list");
      act(() => fireKeyOnElement(container, "Enter"));
      expect(onSelect).toHaveBeenCalledWith("b", expect.any(KeyboardEvent));
    });

    it("enabled: false disables all handlers", () => {
      const onSelect = vi.fn();
      render(
        <TestList initialValue="a" enabled={false} onSelect={onSelect} />,
      );

      const container = screen.getByTestId("list");
      act(() => fireKeyOnElement(container, "ArrowDown"));
      expect(getFocused()).toBe("a");

      act(() => fireKeyOnElement(container, " "));
      expect(onSelect).not.toHaveBeenCalled();
    });

    it("custom upKeys/downKeys", () => {
      render(
        <TestList initialValue="a" upKeys={["ArrowUp", "k"]} downKeys={["ArrowDown", "j"]} />,
      );

      const container = screen.getByTestId("list");
      act(() => fireKeyOnElement(container, "j"));
      expect(getFocused()).toBe("b");

      act(() => fireKeyOnElement(container, "k"));
      expect(getFocused()).toBe("a");
    });

    it("fires onHighlightChange when focus moves", () => {
      const onHighlightChange = vi.fn();
      render(<TestList initialValue="a" onHighlightChange={onHighlightChange} />);

      const container = screen.getByTestId("list");
      act(() => fireKeyOnElement(container, "ArrowDown"));
      expect(onHighlightChange).toHaveBeenCalledWith("b");
    });
  });

  describe("controlled mode", () => {
    it("value prop sets focused value", () => {
      render(<TestList value="b" />);
      expect(getFocused()).toBe("b");
    });

    it("onValueChange called on navigation", () => {
      const onValueChange = vi.fn();
      render(<TestList value="a" onValueChange={onValueChange} />);

      const container = screen.getByTestId("list");
      act(() => fireKeyOnElement(container, "ArrowDown"));
      expect(onValueChange).toHaveBeenCalledWith("b");
    });
  });

  describe("horizontal orientation", () => {
    it("ArrowRight moves to next item", () => {
      render(<TestList initialValue="a" orientation="horizontal" />);

      const container = screen.getByTestId("list");
      act(() => fireKeyOnElement(container, "ArrowRight"));
      expect(getFocused()).toBe("b");
    });

    it("ArrowLeft moves to previous item", () => {
      render(<TestList initialValue="b" orientation="horizontal" />);

      const container = screen.getByTestId("list");
      act(() => fireKeyOnElement(container, "ArrowLeft"));
      expect(getFocused()).toBe("a");
    });

    it("ArrowUp/ArrowDown do not navigate in horizontal mode", () => {
      render(<TestList initialValue="a" orientation="horizontal" />);

      const container = screen.getByTestId("list");
      act(() => fireKeyOnElement(container, "ArrowDown"));
      expect(getFocused()).toBe("a");

      act(() => fireKeyOnElement(container, "ArrowUp"));
      expect(getFocused()).toBe("a");
    });
  });

  describe("skipDisabled", () => {
    function SkipDisabledList({ skipDisabled }: { skipDisabled?: boolean }) {
      const ref = useRef<HTMLDivElement>(null);
      const result = useNavigation({
        containerRef: ref,
        role: "option",
        initialValue: "a",
        skipDisabled,
      });

      return (
        <div
          ref={ref}
          data-testid="list"
          onKeyDown={result.onKeyDown as unknown as React.KeyboardEventHandler}
        >
          <div role="option" data-value="a" />
          <div role="option" data-value="b" aria-disabled="true" />
          <div role="option" data-value="c" />
          <span data-testid="focused">{result.highlighted ?? ""}</span>
        </div>
      );
    }

    it("skips disabled items by default", () => {
      render(<SkipDisabledList />);

      const container = screen.getByTestId("list");
      act(() => fireKeyOnElement(container, "ArrowDown"));
      expect(getFocused()).toBe("c");
    });

    it("includes disabled items when skipDisabled is false", () => {
      render(<SkipDisabledList skipDisabled={false} />);

      const container = screen.getByTestId("list");
      act(() => fireKeyOnElement(container, "ArrowDown"));
      expect(getFocused()).toBe("b");
    });
  });

  describe("role='button'", () => {
    function ButtonList() {
      const ref = useRef<HTMLDivElement>(null);
      const result = useNavigation({
        containerRef: ref,
        role: "button",
        initialValue: "save",
        orientation: "horizontal",
      });

      return (
        <div
          ref={ref}
          data-testid="list"
          onKeyDown={result.onKeyDown as unknown as React.KeyboardEventHandler}
        >
          <div role="button" data-value="save" />
          <div role="button" data-value="cancel" />
          <div role="button" data-value="reset" />
          <span data-testid="focused">{result.highlighted ?? ""}</span>
        </div>
      );
    }

    it("navigates button-role items with horizontal keys", () => {
      render(<ButtonList />);

      const container = screen.getByTestId("list");
      act(() => fireKeyOnElement(container, "ArrowRight"));
      expect(getFocused()).toBe("cancel");

      act(() => fireKeyOnElement(container, "ArrowRight"));
      expect(getFocused()).toBe("reset");

      act(() => fireKeyOnElement(container, "ArrowLeft"));
      expect(getFocused()).toBe("cancel");
    });
  });

  describe("moveFocus", () => {
    function MoveFocusList({
      onSelect,
      onEnter,
    }: {
      onSelect?: (value: string, event: globalThis.KeyboardEvent) => void;
      onEnter?: (value: string, event: globalThis.KeyboardEvent) => void;
    }) {
      const ref = useRef<HTMLDivElement>(null);
      const result = useNavigation({
        containerRef: ref,
        role: "button",
        initialValue: "a",
        moveFocus: true,
        onSelect,
        onEnter,
      });

      return (
        <div
          ref={ref}
          data-testid="list"
          onKeyDown={result.onKeyDown as unknown as React.KeyboardEventHandler}
        >
          <button role="button" data-value="a" data-testid="btn-a">A</button>
          <button role="button" data-value="b" data-testid="btn-b">B</button>
          <button role="button" data-value="c" data-testid="btn-c">C</button>
          <span data-testid="focused">{result.highlighted ?? ""}</span>
        </div>
      );
    }

    it("calls el.focus() on arrow navigation", () => {
      render(<MoveFocusList />);

      const container = screen.getByTestId("list");
      const btnB = screen.getByTestId("btn-b");
      const focusSpy = vi.spyOn(btnB, "focus");

      act(() => fireKeyOnElement(container, "ArrowDown"));
      expect(getFocused()).toBe("b");
      expect(focusSpy).toHaveBeenCalled();
    });

    it("does not call onSelect on Space", () => {
      const onSelect = vi.fn();
      render(<MoveFocusList onSelect={onSelect} />);

      const container = screen.getByTestId("list");
      act(() => fireKeyOnElement(container, " "));
      expect(onSelect).not.toHaveBeenCalled();
    });

    it("does not call onEnter on Enter", () => {
      const onEnter = vi.fn();
      render(<MoveFocusList onEnter={onEnter} />);

      const container = screen.getByTestId("list");
      act(() => fireKeyOnElement(container, "Enter"));
      expect(onEnter).not.toHaveBeenCalled();
    });

    it("still handles Home/End", () => {
      render(<MoveFocusList />);

      const container = screen.getByTestId("list");
      act(() => fireKeyOnElement(container, "End"));
      expect(getFocused()).toBe("c");

      act(() => fireKeyOnElement(container, "Home"));
      expect(getFocused()).toBe("a");
    });
  });

  describe("dev warning", () => {
    it("warns when no elements match role selector", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      function EmptyList() {
        const ref = useRef<HTMLDivElement>(null);
        const result = useNavigation({
          containerRef: ref,
          role: "option",
          initialValue: "a",
        });

        return (
          <div
            ref={ref}
            data-testid="list"
            onKeyDown={result.onKeyDown as unknown as React.KeyboardEventHandler}
          >
            {/* No elements with role="option" */}
            <span data-testid="focused">{result.highlighted ?? ""}</span>
          </div>
        );
      }

      render(<EmptyList />);
      const container = screen.getByTestId("list");
      act(() => fireKeyOnElement(container, "ArrowDown"));

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[role="option"]'),
      );

      warnSpy.mockRestore();
    });
  });
});
