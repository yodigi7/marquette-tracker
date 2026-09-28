import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "next-themes";
import { BACKUP_FORMAT, createBackup, serializeBackup } from "@/core/backup";
import { fullSnapshot } from "@/core/backup/__tests__/fixtures";
import { CSV_EXPORT_COLUMNS } from "@/core/export";
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

describe("Settings CSV export", () => {
  function downloadedBlob(): Blob {
    return vi.mocked(URL.createObjectURL).mock.calls[0][0] as Blob;
  }

  function downloadedName(): string {
    const click = vi.mocked(HTMLAnchorElement.prototype.click);
    return (click.mock.instances[0] as HTMLAnchorElement).download;
  }

  it("offers a spreadsheet export beside the JSON actions", () => {
    renderSettings();

    expect(screen.getByTestId("settings-csv-export")).toBeInTheDocument();
    expect(screen.getByTestId("settings-backup-export")).toBeInTheDocument();
    expect(screen.getByTestId("settings-backup-import")).toBeInTheDocument();
  });

  it("says the file is for a spreadsheet and cannot be imported back", () => {
    renderSettings();

    const description = screen.getByTestId("settings-csv-description").textContent ?? "";
    expect(description).toMatch(/spreadsheet/i);
    expect(description).toMatch(/cannot be imported|can't be imported/i);
    expect(description).not.toMatch(/backup|restore/i);
  });

  it("writes a dated local CSV file without uploading data or changing records", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await seedExistingData();
    renderSettings();

    await user.click(screen.getByTestId("settings-csv-export"));

    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalledTimes(1));
    expect(downloadedBlob().type).toBe("text/csv");
    expect(downloadedName()).toMatch(/^marquette-tracker-export-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(store().cycles).toHaveLength(1);
    expect(store().dayRecords).toHaveLength(1);
    expect(await screen.findByTestId("settings-csv-status")).toHaveTextContent(/downloaded/i);
  });

  it("puts the stored records in the file, not the JSON backup", async () => {
    const user = userEvent.setup();
    await seedExistingData();
    renderSettings();

    await user.click(screen.getByTestId("settings-csv-export"));

    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalledTimes(1));
    // `Blob.text()` decodes UTF-8 and drops a leading BOM, so the BOM itself is
    // asserted in the writer's own tests; what matters here is that the file the
    // user receives is the CSV projection and not the JSON backup.
    const text = await downloadedBlob().text();
    expect(text.split("\r\n")[0]).toBe(CSV_EXPORT_COLUMNS.join(","));
    expect(text).toContain("day,2026-03-01,1");
    expect(text).not.toContain("marquette-tracker-backup");
  });

  it("offers no way to load a CSV back in", () => {
    renderSettings();

    // The only file control in the section still accepts JSON only, so there is
    // no surface anywhere that would take a CSV as a restore source.
    expect(screen.getByTestId("settings-backup-import")).toHaveAttribute(
      "accept",
      "application/json,.json",
    );
  });

  it("writes Celsius even while the display preference is Fahrenheit", async () => {
    const user = userEvent.setup();
    await seedExistingData();
    await store().addDayRecord("", "2026-03-01", 1, { bbt: 36.5 });
    await store().updateSettings({ temperatureUnit: "f" });
    renderSettings();

    await user.click(screen.getByTestId("settings-csv-export"));

    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalledTimes(1));
    const text = await downloadedBlob().text();
    // The seeded records carry no field that needs quoting, so a plain split is
    // enough to read one cell here.
    const rows = text.split("\r\n").filter(Boolean);
    const index = CSV_EXPORT_COLUMNS.indexOf("bbt_c");
    expect(rows[1].split(",")[index]).toBe("36.5");
  });

  it("leaves the JSON backup the versioned document it was", async () => {
    const user = userEvent.setup();
    await seedExistingData();
    renderSettings();

    await user.click(screen.getByTestId("settings-csv-export"));
    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalledTimes(1));
    await user.click(screen.getByTestId("settings-backup-export"));

    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalledTimes(2));
    const json = vi.mocked(URL.createObjectURL).mock.calls[1][0] as Blob;
    expect(json.type).toBe("application/json");
    const text = await json.text();
    expect(text).toContain(`"format": "${BACKUP_FORMAT}"`);
    expect(text).not.toContain("row_type");
  });
});
