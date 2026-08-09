import { useEffect } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { useAppStore } from '@/core/store/useAppStore'

export function Providers({ children }: { children: React.ReactNode }) {
  const hydrated = useAppStore((state) => state.hydrated)

  useEffect(() => {
    void useAppStore.getState().hydrate()
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