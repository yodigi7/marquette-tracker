import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { todayKey } from "@/core/dateKeys";
import { useAppStore } from "@/core/store/useAppStore";
import { App } from "../main";

function mockMatchMedia() {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

async function prepareStore() {
  useAppStore.setState({ hydrated: false });
  await useAppStore.getState().hydrate();
  await useAppStore.getState().clearAllData();
  sessionStorage.setItem(`marquette-calendar-auto-open:${todayKey()}`, "consumed");
}

describe("App hash routing", () => {
  beforeEach(async () => {
    mockMatchMedia();
    window.history.replaceState(null, "", "/");
    await prepareStore();
  });

  afterEach(() => {
    cleanup();
    window.history.replaceState(null, "", "/");
  });

  it("renders Calendar from #/", async () => {
    window.location.hash = "#/";
    render(<App />);

    expect(await screen.findByRole("button", { name: /previous month/i })).toBeInTheDocument();
    expect(window.location.hash).toBe("#/");
  });

  it("renders Status from #/status", async () => {
    window.location.hash = "#/status";
    render(<App />);

    expect(await screen.findByTestId("date-trigger")).toBeInTheDocument();
    expect(window.location.hash).toBe("#/status");
  });

  it("renders History from #/history", async () => {
    window.location.hash = "#/history";
    render(<App />);

    expect(await screen.findByText("Forecast")).toBeInTheDocument();
    expect(window.location.hash).toBe("#/history");
  });

  it("renders Settings from #/settings", async () => {
    window.location.hash = "#/settings";
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(window.location.hash).toBe("#/settings");
  });

  it("renders the cycle route from #/cycle/<id>", async () => {
    window.location.hash = "#/cycle/missing-cycle";
    render(<App />);

    expect(await screen.findByText(/no cycle chart yet/i)).toBeInTheDocument();
    expect(window.location.hash).toBe("#/cycle/missing-cycle");
  });
});
