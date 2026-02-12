import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, screen, act } from "@testing-library/react";
import { useRef, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useTabNavigation } from "./use-tab-navigation";

type Orientation = "horizontal" | "vertical";

interface TestTabListProps {
  tabs?: Array<{ id: string; label: string; disabled?: boolean }>;
  orientation?: Orientation;
  wrap?: boolean;
}

function TestTabList({
  tabs = [
    { id: "tab-1", label: "Tab 1" },
    { id: "tab-2", label: "Tab 2" },
    { id: "tab-3", label: "Tab 3" },
  ],
  orientation = "horizontal",
  wrap = true,
}: TestTabListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { onKeyDown } = useTabNavigation({ containerRef, orientation, wrap });

  return (
    <div
      ref={containerRef}
      role="tablist"
      data-testid="tablist"
      onKeyDown={onKeyDown as unknown as React.KeyboardEventHandler}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          disabled={tab.disabled}
          data-testid={tab.id}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function fireKeyOnElement(element: HTMLElement, key: string) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
  });
  element.dispatchEvent(event);
}

describe("useTabNavigation", () => {
  afterEach(() => {
    cleanup();
  });

  describe("horizontal orientation", () => {
    it("ArrowRight moves focus to the next tab", () => {
      render(<TestTabList />);
      const tab1 = screen.getByTestId("tab-1");
      tab1.focus();

      act(() => fireKeyOnElement(tab1, "ArrowRight"));
      expect(document.activeElement).toBe(screen.getByTestId("tab-2"));
    });

    it("ArrowLeft moves focus to the previous tab", () => {
      render(<TestTabList />);
      const tab2 = screen.getByTestId("tab-2");
      tab2.focus();

      act(() => fireKeyOnElement(tab2, "ArrowLeft"));
      expect(document.activeElement).toBe(screen.getByTestId("tab-1"));
    });

    it("ArrowRight at last tab wraps to first", () => {
      render(<TestTabList />);
      const tab3 = screen.getByTestId("tab-3");
      tab3.focus();

      act(() => fireKeyOnElement(tab3, "ArrowRight"));
      expect(document.activeElement).toBe(screen.getByTestId("tab-1"));
    });

    it("ArrowLeft at first tab wraps to last", () => {
      render(<TestTabList />);
      const tab1 = screen.getByTestId("tab-1");
      tab1.focus();

      act(() => fireKeyOnElement(tab1, "ArrowLeft"));
      expect(document.activeElement).toBe(screen.getByTestId("tab-3"));
    });
  });

  describe("vertical orientation", () => {
    it("ArrowDown moves focus to the next tab", () => {
      render(<TestTabList orientation="vertical" />);
      const tab1 = screen.getByTestId("tab-1");
      tab1.focus();

      act(() => fireKeyOnElement(tab1, "ArrowDown"));
      expect(document.activeElement).toBe(screen.getByTestId("tab-2"));
    });

    it("ArrowUp moves focus to the previous tab", () => {
      render(<TestTabList orientation="vertical" />);
      const tab2 = screen.getByTestId("tab-2");
      tab2.focus();

      act(() => fireKeyOnElement(tab2, "ArrowUp"));
      expect(document.activeElement).toBe(screen.getByTestId("tab-1"));
    });
  });

  describe("Home and End keys", () => {
    it("Home focuses the first tab", () => {
      render(<TestTabList />);
      const tab3 = screen.getByTestId("tab-3");
      tab3.focus();

      act(() => fireKeyOnElement(tab3, "Home"));
      expect(document.activeElement).toBe(screen.getByTestId("tab-1"));
    });

    it("End focuses the last tab", () => {
      render(<TestTabList />);
      const tab1 = screen.getByTestId("tab-1");
      tab1.focus();

      act(() => fireKeyOnElement(tab1, "End"));
      expect(document.activeElement).toBe(screen.getByTestId("tab-3"));
    });
  });

  describe("wrap: false", () => {
    it("ArrowRight at last tab stays on last tab", () => {
      render(<TestTabList wrap={false} />);
      const tab3 = screen.getByTestId("tab-3");
      tab3.focus();

      act(() => fireKeyOnElement(tab3, "ArrowRight"));
      expect(document.activeElement).toBe(screen.getByTestId("tab-3"));
    });

    it("ArrowLeft at first tab stays on first tab", () => {
      render(<TestTabList wrap={false} />);
      const tab1 = screen.getByTestId("tab-1");
      tab1.focus();

      act(() => fireKeyOnElement(tab1, "ArrowLeft"));
      expect(document.activeElement).toBe(screen.getByTestId("tab-1"));
    });
  });

  describe("disabled tabs", () => {
    it("skips disabled tabs when navigating", () => {
      render(
        <TestTabList
          tabs={[
            { id: "tab-1", label: "Tab 1" },
            { id: "tab-2", label: "Tab 2", disabled: true },
            { id: "tab-3", label: "Tab 3" },
          ]}
        />,
      );
      const tab1 = screen.getByTestId("tab-1");
      tab1.focus();

      act(() => fireKeyOnElement(tab1, "ArrowRight"));
      expect(document.activeElement).toBe(screen.getByTestId("tab-3"));
    });
  });

  describe("edge cases", () => {
    it("handles empty container gracefully", () => {
      function EmptyTabList() {
        const containerRef = useRef<HTMLDivElement>(null);
        const { onKeyDown } = useTabNavigation({ containerRef });

        return (
          <div
            ref={containerRef}
            role="tablist"
            data-testid="empty-tablist"
            onKeyDown={onKeyDown as unknown as React.KeyboardEventHandler}
          />
        );
      }

      render(<EmptyTabList />);
      const tablist = screen.getByTestId("empty-tablist");

      // Should not throw
      act(() => fireKeyOnElement(tablist, "ArrowRight"));
    });

    it("handles single tab", () => {
      render(
        <TestTabList tabs={[{ id: "tab-1", label: "Tab 1" }]} />,
      );
      const tab1 = screen.getByTestId("tab-1");
      tab1.focus();

      act(() => fireKeyOnElement(tab1, "ArrowRight"));
      expect(document.activeElement).toBe(screen.getByTestId("tab-1"));
    });
  });
});
