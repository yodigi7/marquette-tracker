import { CoreSection } from './core-section'
import { DangerSection } from './danger-section'
import { DisplaySection } from './display-section'
import { ThemeSection } from './theme-section'

export function SettingsView() {
  return (
    <div className="mx-auto max-w-xl space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-stone-500">
          Preferences are stored locally on this device.
        </p>
      </header>

      <section aria-labelledby="core-settings-heading">
        <h2 id="core-settings-heading" className="text-lg font-medium">
          Core settings
        </h2>
        <div className="space-y-5 rounded-lg border p-4">
          <CoreSection />
          <ThemeSection />
        </div>
      </section>

      <section aria-labelledby="display-settings-heading">
        <h2 id="display-settings-heading" className="text-lg font-medium">
          Display &amp; protocol
        </h2>
        <div className="space-y-5 rounded-lg border p-4" data-testid="display-settings">
          <DisplaySection />
        </div>
      </section>

      <section aria-labelledby="danger-settings-heading">
        <h2 id="danger-settings-heading" className="text-lg font-medium">
          Danger zone
        </h2>
        <div className="space-y-5 rounded-lg border border-destructive/40 p-4" data-testid="danger-settings">
          <DangerSection />
        </div>
      </section>
    </div>
  )
}