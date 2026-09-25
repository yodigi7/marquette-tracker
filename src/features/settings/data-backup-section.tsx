import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { prepareBackup, serializeBackup, type BackupDocument, type PreparedBackup } from '@/core/backup'
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

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return 'The backup could not be processed.'
}

function downloadBackup(backup: BackupDocument) {
  const blob = new Blob([serializeBackup(backup)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = window.document.createElement('a')
  anchor.href = url
  anchor.download = `marquette-tracker-backup-${backup.exportedAt.slice(0, 10)}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

export function DataBackupSection() {
  const createBackup = useAppStore((state) => state.createBackup)
  const restoreBackup = useAppStore((state) => state.restoreBackup)
  const fileInput = useRef<HTMLInputElement>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [prepared, setPrepared] = useState<PreparedBackup | null>(null)
  const [acknowledged, setAcknowledged] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  function closeDialog() {
    setDialogOpen(false)
    setPrepared(null)
    setAcknowledged(false)
  }

  async function handleExport() {
    setBusy(true)
    setError(null)
    try {
      const backup = await createBackup()
      downloadBackup(backup)
      setStatus('Backup downloaded locally.')
      toast.success('Backup downloaded locally.')
    } catch (caught) {
      const message = errorMessage(caught)
      setError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const file = input.files?.[0]
    input.value = ''
    if (!file) {
      return
    }

    setBusy(true)
    setError(null)
    setStatus(null)
    try {
      const text = await file.text()
      setPrepared(prepareBackup(text))
      setAcknowledged(false)
      setDialogOpen(true)
    } catch (caught) {
      const message = errorMessage(caught)
      setError(message)
      setPrepared(null)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  async function handleDownloadCurrent() {
    setBusy(true)
    try {
      const backup = await createBackup()
      downloadBackup(backup)
      setStatus('Current data downloaded locally.')
    } catch (caught) {
      const message = errorMessage(caught)
      setError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  async function handleRestore() {
    if (!prepared || !acknowledged) {
      return
    }

    setBusy(true)
    setError(null)
    try {
      const result = await restoreBackup(prepared)
      const message = `Restored ${result.cycleCount} cycles and ${result.dayRecordCount} day records.`
      setStatus(message)
      toast.success(message)
      closeDialog()
    } catch (caught) {
      const message = errorMessage(caught)
      setError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3" data-testid="data-backup-settings">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          data-testid="settings-backup-export"
          disabled={busy}
          onClick={() => void handleExport()}
        >
          Export JSON backup
        </Button>
        <Label
          htmlFor="settings-backup-file"
          className="inline-flex h-8 cursor-pointer items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted focus-within:ring-3 focus-within:ring-ring/50"
        >
          Choose JSON backup
        </Label>
        <input
          ref={fileInput}
          id="settings-backup-file"
          data-testid="settings-backup-import"
          type="file"
          accept="application/json,.json"
          className="sr-only"
          disabled={busy}
          onChange={(event) => void handleFileChange(event)}
        />
      </div>
      <p className="text-sm text-stone-500">
        Backups stay on this device. Restoring replaces the current records and settings after confirmation.
      </p>
      {status ? (
        <p role="status" data-testid="settings-backup-status" className="text-sm text-stone-600">
          {status}
        </p>
      ) : null}
      {error ? (
        <p role="alert" data-testid="settings-backup-error" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeDialog()
          }
        }}
      >
        <DialogContent data-testid="settings-backup-dialog">
          <DialogHeader>
            <DialogTitle>Restore JSON backup?</DialogTitle>
            <DialogDescription>
              This replaces every current cycle, day record, and setting on this device. It cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {prepared ? (
            <div className="space-y-2 text-sm" data-testid="settings-backup-summary">
              <p>
                Backup app version {prepared.summary.appVersion}; exported {prepared.summary.exportedAt}.
              </p>
              <p>
                {prepared.summary.cycleCount} cycles · {prepared.summary.dayRecordCount} day records ·{' '}
                {prepared.summary.settingsIncluded ? 'settings included' : 'settings missing'}
              </p>
            </div>
          ) : null}
          <div className="flex items-start gap-2">
            <input
              id="settings-backup-ack"
              data-testid="settings-backup-ack"
              type="checkbox"
              checked={acknowledged}
              onChange={(event) => setAcknowledged(event.target.checked)}
              className="mt-0.5 size-4"
            />
            <Label htmlFor="settings-backup-ack">I understand this replaces the current local data.</Label>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              data-testid="settings-backup-download-current"
              onClick={() => void handleDownloadCurrent()}
              disabled={busy}
            >
              Download current data
            </Button>
            <Button type="button" variant="outline" data-testid="settings-backup-cancel" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              data-testid="settings-backup-confirm"
              disabled={!prepared || !acknowledged || busy}
              onClick={() => void handleRestore()}
            >
              Replace local data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
