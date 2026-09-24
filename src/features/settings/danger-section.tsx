import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useAppStore } from '@/core/store/useAppStore'

export function DangerSection() {
  const clearAllData = useAppStore((state) => state.clearAllData)
  const [open, setOpen] = useState(false)
  const [ack, setAck] = useState(false)

  return (
    <div className="space-y-2">
      <Button variant="destructive" data-testid="settings-clear-data" onClick={() => setOpen(true)}>
        Clear all data
      </Button>
      <p className="text-sm text-stone-500">
        Permanently deletes every cycle and day record; settings return to defaults.
      </p>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) {
            setAck(false)
          }
        }}
      >
        <DialogContent data-testid="settings-clear-dialog">
          <DialogHeader>
            <DialogTitle>Clear all data?</DialogTitle>
            <DialogDescription>
              This permanently deletes every cycle and day record on this device and resets settings
              to their defaults. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-start gap-2">
            <input
              id="settings-clear-ack"
              type="checkbox"
              data-testid="settings-clear-ack"
              checked={ack}
              onChange={(event) => setAck(event.target.checked)}
              className="mt-0.5 size-4"
            />
            <Label htmlFor="settings-clear-ack">
              I understand this deletes everything on this device.
            </Label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              data-testid="settings-clear-execute"
              disabled={!ack}
              onClick={() => {
                void clearAllData().then(() => {
                  setOpen(false)
                  setAck(false)
                })
              }}
            >
              Delete everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}