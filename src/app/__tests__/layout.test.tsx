import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { HashRouter, MemoryRouter } from "react-router";
import { RootLayout } from "../layout";

const NAV_ITEMS = [
  { label: "Calendar", to: "/" },
  { label: "Status", to: "/status" },
  { label: "History", to: "/history" },
  { label: "Settings", to: "/settings" },
];

function renderLayout(initialEntries: string[] = ["/"]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <RootLayout />
    </MemoryRouter>,
  );
}

function openMobileMenu() {
  fireEvent.click(screen.getByRole("button", { name: /open navigation/i }));
}

describe("RootLayout navigation (app-shell)", () => {
  afterEach(() => cleanup());

  const desktopNav = (container: HTMLElement) => container.querySelector("nav") as HTMLElement;

  it.each(NAV_ITEMS)(
    "renders the $label link on both the desktop bar and the mobile menu with the same destination",
    ({ label, to }) => {
      const { container } = renderLayout();

      const desktopLink = within(desktopNav(container)).getByRole("link", {
        name: label,
      });
      expect(desktopLink).toHaveAttribute("href", to);

      openMobileMenu();

      const links = screen.getAllByRole("link", { name: label, hidden: true });
      expect(links).toHaveLength(2);
      for (const link of links) {
        expect(link).toHaveAttribute("href", to);
      }
    },
  );

  it.each(NAV_ITEMS.map((l) => [l.label]))(
    "keeps the %s desktop link hover readable in dark mode (theme-aware tokens, no hardcoded stone hover)",
    (label) => {
      const { container } = renderLayout();
      const desktopLink = within(container.querySelector("nav") as HTMLElement).getByRole("link", {
        name: label as string,
      });

      expect(desktopLink.className).toContain("hover:text-foreground");
      expect(desktopLink.className).not.toContain("hover:text-stone-900");
    },
  );

  it("marks only the active navigation item with aria-current on both surfaces", () => {
    renderLayout(["/status"]);
    openMobileMenu();

    for (const item of NAV_ITEMS) {
      const links = screen.getAllByRole("link", { name: item.label, hidden: true });
      expect(links).toHaveLength(2);
      for (const link of links) {
        if (item.to === "/status") {
          expect(link).toHaveAttribute("aria-current", "page");
          expect(link.className).toContain("text-foreground");
        } else {
          expect(link).not.toHaveAttribute("aria-current");
          expect(link.className).toContain("text-muted-foreground");
        }
      }
    }
  });

  it("does not expose Today or a separate Calendar route", () => {
    const { container } = renderLayout();

    expect(screen.queryAllByRole("link", { name: "Today", hidden: true })).toHaveLength(0);
    expect(within(desktopNav(container)).getByRole("link", { name: "Calendar" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(
      screen
        .queryAllByRole("link", { name: "Calendar", hidden: true })
        .every((link) => link.getAttribute("href") === "/"),
    ).toBe(true);
  });

  it("exposes the finalized hash destinations on desktop and mobile", () => {
    window.location.hash = "#/";
    const { container } = render(
      <HashRouter>
        <RootLayout />
      </HashRouter>,
    );
    const destinations = [
      { label: "Calendar", href: "#/" },
      { label: "Status", href: "#/status" },
      { label: "History", href: "#/history" },
      { label: "Settings", href: "#/settings" },
    ];

    for (const { label, href } of destinations) {
      expect(within(desktopNav(container)).getByRole("link", { name: label })).toHaveAttribute(
        "href",
        href,
      );
    }

    openMobileMenu();
    for (const { label, href } of destinations) {
      const links = screen.getAllByRole("link", { name: label, hidden: true });
      expect(links).toHaveLength(2);
      for (const link of links) {
        expect(link).toHaveAttribute("href", href);
      }
    }

    expect(screen.queryAllByRole("link", { name: "Today", hidden: true })).toHaveLength(0);
    expect(
      screen
        .queryAllByRole("link", { name: "Calendar", hidden: true })
        .every((link) => link.getAttribute("href") !== "#/calendar"),
    ).toBe(true);
  });

  it("suppresses the navigation and the page padding in print, and nothing else", () => {
    // A document route prints on its own: the shell's chrome is the one thing that must not reach
    // the paper. `print:` is a Tailwind variant, so the class name is the whole contract.
    const { container } = renderLayout();

    const header = container.querySelector("header");
    expect(header).not.toBeNull();
    expect(header?.className).toContain("print:hidden");

    const main = container.querySelector("main");
    expect(main?.className).toContain("print:p-0");

    // Everything else about the shell is unchanged on screen.
    expect(header?.className).toContain("border-b");
    expect(main?.className).toContain("px-4");
    expect(main?.className).toContain("py-6");
  });

  it("does not add a document route to the primary navigation", () => {
    // The cycle summary is reached from a cycle's own chart, not from the nav bar.
    const { container } = renderLayout();
    const labels = Array.from(desktopNav(container).querySelectorAll("a")).map(
      (a) => a.textContent,
    );

    expect(labels).toEqual(["Calendar", "Status", "History", "Settings"]);
  });
});

/**
 * The app title is a shortcut home, not a primary destination. These cover both viewport surfaces,
 * the one copy per surface, the link affordance, and the rule that the Calendar nav item keeps sole
 * ownership of the current-page marker.
 */
describe("RootLayout title link (app-shell)", () => {
  afterEach(() => cleanup());

  const TITLE = "Marquette Tracker";

  const titleLinks = () => screen.getAllByRole("link", { name: TITLE, hidden: true });

  it("renders the title as a link to the root route on both viewport surfaces", () => {
    renderLayout();

    // Exactly one copy per surface: the narrow top bar and the wide-viewport bar.
    const links = titleLinks();
    expect(links).toHaveLength(2);
    for (const link of links) {
      expect(link).toHaveAttribute("href", "/");
    }
  });

  it("renders the title as a real anchor, so it is keyboard-operable and announced as a link", () => {
    const { container } = renderLayout();

    // A <span> is not focusable and is not exposed as a link; an <a href> is both.
    for (const link of titleLinks()) {
      expect(link.tagName).toBe("A");
      expect(link).toHaveAttribute("href");
    }
    expect(
      Array.from(container.querySelectorAll("span")).some(
        (s) => s.textContent === TITLE && !s.querySelector("a"),
      ),
    ).toBe(false);
  });

  it("gives the title a visible hover affordance so it does not read as a static label", () => {
    renderLayout();

    for (const link of titleLinks()) {
      expect(link.className).toContain("hover:underline");
      // `hover:text-foreground` is the nav links' cue, but the title already rests at full
      // foreground, so that class would be a visual no-op. Underline is the project's own link
      // convention (shadcn Button/Badge `link` variant).
      expect(link.className).not.toContain("hover:opacity-0");
    }
  });

  it("never marks the title as the current page, and leaves that marker to the Calendar item", () => {
    // Rendered on `/` specifically: this is where a naive implementation would highlight both.
    renderLayout(["/"]);

    for (const link of titleLinks()) {
      expect(link).not.toHaveAttribute("aria-current");
    }
    const [calendar] = screen.getAllByRole("link", { name: "Calendar", hidden: true });
    expect(calendar).toHaveAttribute("aria-current", "page");
  });

  it("keeps the title out of the primary navigation's destination list", () => {
    // The title is a brand link, not a fifth destination. This is the invariant that
    // `does not add a document route to the primary navigation` protects.
    const { container } = renderLayout();

    const nav = container.querySelector("nav") as HTMLElement;
    const labels = Array.from(nav.querySelectorAll("a")).map((a) => a.textContent);
    expect(labels).toEqual(["Calendar", "Status", "History", "Settings"]);
    expect(labels).not.toContain(TITLE);

    // Stronger than the anchor check: the title must not sit inside the navigation element at all,
    // whether it is text or a link. A brand link nested in the nav landmark is the wrong semantics.
    expect(Array.from(nav.querySelectorAll("*")).some((el) => el.textContent === TITLE)).toBe(
      false,
    );
  });
});
