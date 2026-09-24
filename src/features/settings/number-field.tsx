import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface NumberFieldProps {
  testId: string
  label: string
  value: number
  min: number
  max: number
  /** Optional cross-field rule, e.g. band min must stay below band max. */
  extraRule?(parsed: number): string | null
  onCommit(value: number): void
}

export function NumberField({ testId, label, value, min, max, extraRule, onCommit }: NumberFieldProps) {
  const [raw, setRaw] = useState(String(value))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setRaw(String(value))
    setError(null)
  }, [value])

  function handleChange(next: string) {
    setRaw(next)
    setError(null)
    if (next !== '') {
      const parsed = Number(next)
      if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
        setError(`Must be between ${min} and ${max}`)
      } else if (extraRule) {
        setError(extraRule(parsed))
      }
    }
  }

  function commit() {
    const parsed = Number(raw)
    if (raw !== '' && Number.isInteger(parsed) && parsed >= min && parsed <= max) {
      if (!extraRule || extraRule(parsed) === null) {
        onCommit(parsed)
      }
    }
    setRaw(String(value))
    setError(null)
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={testId}>{label}</Label>
      <Input
        id={testId}
        data-testid={testId}
        type="number"
        inputMode="numeric"
        value={raw}
        aria-invalid={error !== null}
        onChange={(event) => handleChange(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            commit()
          }
        }}
      />
      {error !== null && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}