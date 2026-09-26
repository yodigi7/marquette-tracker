import { Route, Routes } from "react-router";
import { RootLayout } from "@/app/layout";
import { CalendarView } from "@/features/calendar";
import { StatusView } from "@/features/status";
import { CycleChartView } from "@/features/cycle-chart";
import { HistoryView } from "@/features/history";
import { SettingsView } from "@/features/settings";

export function AppRouter() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route index element={<CalendarView />} />
        <Route path="status" element={<StatusView />} />
        <Route path="cycle/:cycleId" element={<CycleChartView />} />
        <Route path="history" element={<HistoryView />} />
        <Route path="settings" element={<SettingsView />} />
      </Route>
    </Routes>
  );
}
