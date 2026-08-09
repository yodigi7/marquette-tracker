import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useAppStore } from '@/core/store/useAppStore'
import { dateKeyLocal } from './lib'

export function StartCycleCard() {
  const [date, setDate] = useState<Date>(() => new Date())
  const setNewCycle = useAppStore((s) => s.setNewCycle)
  const dayKey = dateKeyLocal(date)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Start a new cycle</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-stone-500">Day 1 is the first day of menses. You can pick any past date.</p>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="min-w-28">
                {dayKey}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} />
            </PopoverContent>
          </Popover>
          <Button type="button" onClick={() => void setNewCycle(dayKey)}>
            Set Day 1
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}