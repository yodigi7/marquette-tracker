import { useEffect } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { useAppStore } from '@/core/store/useAppStore'
import { seedDemoData } from '@/core/store/seedDemo'

export function Providers({ children }: { children: React.ReactNode }) {
  const hydrated = useAppStore((state) => state.hydrated)

  useEffect(() => {
    async function boot() {
      const store = useAppStore.getState()
      await store.hydrate()
      // TODO(remove-after-dev): seed demo data on EVERY startup for dev/testing.
      // Remove this block (and seedDemo.ts) once development is done.
      await seedDemoData()
      await useAppStore.getState().updateSettings({ demoSeeded: true })
    }
    void boot()
  }, [])

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-stone-500">Loading…</p>
      </div>
    )
  }

  return (
    <TooltipProvider>
      {children}
      <Toaster />
    </TooltipProvider>
  )
}