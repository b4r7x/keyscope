import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { renderHook, cleanup, act } from "@testing-library/react";
import { useRef, type RefObject } from "react";
import { useFocusTrap } from "./use-focus-trap";

function createContainer(...focusableHTML: string[]) {
  const container = document.createElement("div");
  container.tabIndex = -1;
  for (const html of focusableHTML) {
    container.insertAdjacentHTML("beforeend", html);
  }
  document.body.appendChild(container);
  return container;
}

function fireTab(shiftKey = false) {
  const event = new KeyboardEvent("keydown", {
    key: "Tab",
    shiftKey,
    bubbles: true,
    cancelable: true,
  });
  document.activeElement?.dispatchEvent(event);
  return event;
}

describe("useFocusTrap", () => {
  let container: HTMLDivElement;

  afterEach(() => {
    cleanup();
    container?.remove();
  });

  function renderTrap(
    containerEl: HTMLDivElement,
    options?: Parameters<typeof useFocusTrap>[1],
  ) {
    return renderHook(
      ({ opts }) => {
        const ref = useRef<HTMLElement>(containerEl);
        useFocusTrap(ref, opts);
      },
      { initialProps: { opts: options } },
    );
  }

  describe("initial focus", () => {
    it("focuses first focusable element on mount", () => {
      container = createContainer(
        '<button id="a">A</button>',
        '<button id="b">B</button>',
      );
      renderTrap(container);
      expect(document.activeElement).toBe(container.querySelector("#a"));
    });

    it("focuses container when no focusable elements exist", () => {
      container = createContainer("<p>No focusable</p>");
      renderTrap(container);
      expect(document.activeElement).toBe(container);
    });

    it("focuses initialFocus element when provided", () => {
      container = createContainer(
        '<button id="a">A</button>',
        '<button id="b">B</button>',
      );
      const targetEl = container.querySelector<HTMLElement>("#b")!;

      renderHook(() => {
        const ref = useRef<HTMLElement>(container);
        const initialRef = useRef<HTMLElement>(targetEl);
        useFocusTrap(ref, { initialFocus: initialRef });
      });

      expect(document.activeElement).toBe(targetEl);
    });
  });

  describe("Tab cycling", () => {
    it("wraps focus from last to first on Tab", () => {
      container = createContainer(
        '<button id="a">A</button>',
        '<button id="b">B</button>',
        '<button id="c">C</button>',
      );
      renderTrap(container);

      const last = container.querySelector<HTMLElement>("#c")!;
      last.focus();
      expect(document.activeElement).toBe(last);

      const event = fireTab();
      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(container.querySelector("#a"));
    });

    it("wraps focus from first to last on Shift+Tab", () => {
      container = createContainer(
        '<button id="a">A</button>',
        '<button id="b">B</button>',
        '<button id="c">C</button>',
      );
      renderTrap(container);

      const first = container.querySelector<HTMLElement>("#a")!;
      first.focus();

      const event = fireTab(true);
      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(container.querySelector("#c"));
    });

    it("does not prevent default when focus is in the middle", () => {
      container = createContainer(
        '<button id="a">A</button>',
        '<button id="b">B</button>',
        '<button id="c">C</button>',
      );
      renderTrap(container);

      container.querySelector<HTMLElement>("#b")!.focus();
      const event = fireTab();
      expect(event.defaultPrevented).toBe(false);
    });

    it("handles dynamic content (re-queries on each Tab)", () => {
      container = createContainer(
        '<button id="a">A</button>',
        '<button id="b">B</button>',
      );
      renderTrap(container);

      // Add a new button dynamically
      container.insertAdjacentHTML("beforeend", '<button id="c">C</button>');

      const newLast = container.querySelector<HTMLElement>("#c")!;
      newLast.focus();

      const event = fireTab();
      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(container.querySelector("#a"));
    });
  });

  describe("focus restoration", () => {
    it("restores focus on unmount when restoreFocus is true", () => {
      const outsideButton = document.createElement("button");
      outsideButton.id = "outside";
      document.body.appendChild(outsideButton);
      outsideButton.focus();
      expect(document.activeElement).toBe(outsideButton);

      container = createContainer('<button id="a">A</button>');
      const { unmount } = renderTrap(container, { restoreFocus: true });

      expect(document.activeElement).toBe(container.querySelector("#a"));

      unmount();
      expect(document.activeElement).toBe(outsideButton);

      outsideButton.remove();
    });

    it("does not restore focus when restoreFocus is false", () => {
      const outsideButton = document.createElement("button");
      outsideButton.id = "outside";
      document.body.appendChild(outsideButton);
      outsideButton.focus();

      container = createContainer('<button id="a">A</button>');
      const { unmount } = renderTrap(container, { restoreFocus: false });

      expect(document.activeElement).toBe(container.querySelector("#a"));

      unmount();
      expect(document.activeElement).not.toBe(outsideButton);

      outsideButton.remove();
    });
  });

  describe("enabled option", () => {
    it("does nothing when enabled is false", () => {
      const outsideButton = document.createElement("button");
      document.body.appendChild(outsideButton);
      outsideButton.focus();

      container = createContainer('<button id="a">A</button>');
      renderTrap(container, { enabled: false });

      // Focus should NOT have moved to container
      expect(document.activeElement).toBe(outsideButton);

      outsideButton.remove();
    });

    it("activates when enabled changes from false to true", () => {
      container = createContainer('<button id="a">A</button>');

      const { rerender } = renderHook(
        ({ enabled }) => {
          const ref = useRef<HTMLElement>(container);
          useFocusTrap(ref, { enabled });
        },
        { initialProps: { enabled: false } },
      );

      expect(document.activeElement).not.toBe(container.querySelector("#a"));

      rerender({ enabled: true });
      expect(document.activeElement).toBe(container.querySelector("#a"));
    });
  });

  describe("empty container", () => {
    it("does not crash when container has no focusable elements and Tab is pressed", () => {
      container = createContainer("<p>No buttons</p>");
      renderTrap(container);

      expect(document.activeElement).toBe(container);

      // Should not throw
      const event = fireTab();
      expect(event.defaultPrevented).toBe(false);
    });
  });
});
