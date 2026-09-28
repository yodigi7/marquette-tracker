import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "next-themes";
import { createBackup, serializeBackup } from "@/core/backup";
import { fullSnapshot } from "@/core/backup/__tests__/fixtures";
import { useAppStore } from "@/core/store/useAppStore";
import { SettingsView } from "../index";

const store = () => useAppStore.getState();

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

function renderSettings() {
  mockMatchMedia();
  return render(
    <ThemeProvider attribute="class" defaultTheme="system">
      <SettingsView />
    </ThemeProvider>,
  );
}

function backupFile() {
  const text = serializeBackup(
    createBackup(fullSnapshot(), {
      appVersion: "1.0.0",
      exportedAt: "2026-02-03T04:05:06.000Z",
    }),
  );
  return new File([text], "marquette-backup.json", { type: "application/json" });
}

async function seedExistingData() {
  await store().setNewCycle("2026-03-01");
  await store().addDayRecord("", "2026-03-01", 1, { bloodFlow: "medium" });
}

beforeEach(async () => {
  Object.defineProperty(URL, "createObjectURL", {
    writable: true,
    value: vi.fn(() => "blob:marquette-backup"),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    writable: true,
    value: vi.fn(),
  });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  useAppStore.setState({ hydrated: false });
  await useAppStore.getState().hydrate();
  await useAppStore.getState().clearAllData();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Settings JSON backup and restore", () => {
  it("places Data & backup between display/protocol and danger zone", () => {
    renderSettings();

    const headings = screen
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent);
    expect(headings).toEqual([
      "Core settings",
      "Display & protocol",
      "Data & backup",
      "Danger zone",
    ]);
    expect(screen.getByTestId("data-backup-settings")).toBeInTheDocument();
    expect(screen.getByTestId("settings-backup-export")).toBeInTheDocument();
    expect(screen.getByTestId("settings-backup-import")).toBeInTheDocument();
  });

  it("exports a local JSON file without uploading data", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    renderSettings();

    await user.click(screen.getByTestId("settings-backup-export"));

    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalledTimes(1));
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("validates a selected file and shows a summary without restoring", async () => {
    const user = userEvent.setup();
    await seedExistingData();
    renderSettings();

    await user.upload(screen.getByTestId("settings-backup-import"), backupFile());

    expect(await screen.findByTestId("settings-backup-dialog")).toBeInTheDocument();
    expect(screen.getByTestId("settings-backup-summary")).toHaveTextContent("2 cycles");
    expect(screen.getByTestId("settings-backup-summary")).toHaveTextContent("4 day records");
    expect(store().cycles).toHaveLength(1);
    expect(screen.getByTestId("settings-backup-confirm")).toBeDisabled();
  });

  it("requires acknowledgement before replacing the complete dataset", async () => {
    const user = userEvent.setup();
    await seedExistingData();
    renderSettings();

    await user.upload(screen.getByTestId("settings-backup-import"), backupFile());
    await user.click(await screen.findByTestId("settings-backup-ack"));
    expect(screen.getByTestId("settings-backup-confirm")).toBeEnabled();
    await user.click(screen.getByTestId("settings-backup-confirm"));

    await waitFor(() => expect(store().cycles).toHaveLength(2));
    expect(store().settings.goal).toBe("achieve-pregnancy");
    // the dialog closes once the restore settles; under parallel load that is
    // a tick after the store updates, so wait for it rather than sampling once
    await waitFor(() =>
      expect(screen.queryByTestId("settings-backup-dialog")).not.toBeInTheDocument(),
    );
  });

  it("offers an optional current-data download before replacement", async () => {
    const user = userEvent.setup();
    await seedExistingData();
    renderSettings();

    await user.upload(screen.getByTestId("settings-backup-import"), backupFile());
    await user.click(await screen.findByTestId("settings-backup-download-current"));

    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalledTimes(1));
    expect(store().cycles).toHaveLength(1);
  });

  it("leaves data intact when the confirmation is cancelled", async () => {
    const user = userEvent.setup();
    await seedExistingData();
    renderSettings();

    await user.upload(screen.getByTestId("settings-backup-import"), backupFile());
    await user.click(await screen.findByTestId("settings-backup-cancel"));

    expect(screen.queryByTestId("settings-backup-dialog")).not.toBeInTheDocument();
    expect(store().cycles).toHaveLength(1);
    expect(store().dayRecords).toHaveLength(1);
  });

  it("shows an unsupported-backup error and never opens confirmation", async () => {
    const user = userEvent.setup();
    const invalid = new File(
      ['{"format":"marquette-tracker-backup","formatVersion":99}'],
      "future.json",
      {
        type: "application/json",
      },
    );
    renderSettings();

    await user.upload(screen.getByTestId("settings-backup-import"), invalid);

    expect(await screen.findByTestId("settings-backup-error")).toHaveTextContent(
      /newer|unsupported/i,
    );
    expect(screen.queryByTestId("settings-backup-dialog")).not.toBeInTheDocument();
  });
});

describe("Restore reports implausible temperatures", () => {
  function snapshotWithBbt(...values: number[]) {
    const base = fullSnapshot();
    return {
      ...base,
      dayRecords: values.map((bbt, index) => ({
        ...base.dayRecords[index % base.dayRecords.length],
        id: `rec-${index}`,
        date: `2026-01-${10 + index}`,
        dayInCycle: 10 + index,
        bbt,
      })),
    };
  }

  function fileWithBbt(...values: number[]) {
    const text = serializeBackup(
      createBackup(snapshotWithBbt(...values), {
        appVersion: "1.0.0",
        exportedAt: "2026-02-03T04:05:06.000Z",
      }),
    );
    return new File([text], "marquette-backup.json", { type: "application/json" });
  }

  it("restores the values exactly and warns about the implausible one", async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.upload(screen.getByTestId("settings-backup-import"), fileWithBbt(36.5, 98.2));
    await user.click(await screen.findByTestId("settings-backup-ack"));
    await user.click(screen.getByTestId("settings-backup-confirm"));

    // The restore succeeds; the reading is kept exactly as it was stored.
    await waitFor(() => expect(store().dayRecords).toHaveLength(2));
    const temperatures = store()
      .dayRecords.map((r) => r.bbt)
      .sort();
    expect(temperatures[0]).toBe(36.5);
    expect(temperatures[1]).toBe(98.2);

    // ...and the user is told one is worth checking.
    await waitFor(() =>
      expect(screen.getByTestId("settings-backup-bbt-warning")).toHaveTextContent(
        /1 temperature reading is outside the usual range/i,
      ),
    );
  });

  it("says nothing about temperature when every reading is ordinary", async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.upload(screen.getByTestId("settings-backup-import"), fileWithBbt(36.5, 37.1));
    await user.click(await screen.findByTestId("settings-backup-ack"));
    await user.click(screen.getByTestId("settings-backup-confirm"));

    await waitFor(() => expect(store().dayRecords).toHaveLength(2));
    expect(await screen.findByTestId("settings-backup-status")).toHaveTextContent("Restored");
    expect(screen.queryByTestId("settings-backup-bbt-warning")).not.toBeInTheDocument();
  });
});
