import { useEffect } from 'react'
import { ThemeProvider } from 'next-themes'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { useAppStore } from '@/core/store/useAppStore'
import { seedDemoData } from '@/core/store/seedDemo'

export function Providers({ children }: { children: React.ReactNode }) {
  const hydrated = useAppStore((state) => state.hydrated)
  const theme = useAppStore((state) => state.settings.theme)

  useEffect(() => {
    async function boot() {
      const store = useAppStore.getState()
      await store.hydrate()
      // TODO(remove-after-dev): seed demo data on FIRST startup only for dev/testing.
      // Remove this block (and seedDemo.ts) once development is done.
      const { demoSeeded } = useAppStore.getState().settings
      if (!demoSeeded) {
        await seedDemoData()
        await useAppStore.getState().updateSettings({ demoSeeded: true })
      }
    }
    void boot().catch((error: unknown) => {
      // hydrate() intentionally leaves the store non-hydrated on failure, so
      // the loading gate remains closed instead of rendering a partial snapshot.
      console.error('App hydration failed', error)
    })
  }, [])

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-stone-500">Loading…</p>
      </div>
    )
  }

  return (
    <ThemeProvider attribute="class" defaultTheme={theme}>
      <TooltipProvider>
        {children}
        <Toaster />
      </TooltipProvider>
    </ThemeProvider>
  )
}