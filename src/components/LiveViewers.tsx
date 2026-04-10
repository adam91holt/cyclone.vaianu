import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Users } from 'lucide-react'

/** Random per-tab viewer id. Persists only in memory — closing the tab drops
 *  presence automatically. */
const VIEWER_ID =
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `v-${Math.random().toString(36).slice(2)}`

export function LiveViewers() {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    const channel = supabase.channel('cyclone-vaianu-dashboard', {
      config: { presence: { key: VIEWER_ID } },
    })

    const refresh = () => {
      const state = channel.presenceState()
      const total = Object.keys(state).length
      setCount(total)
    }

    channel
      .on('presence', { event: 'sync' }, refresh)
      .on('presence', { event: 'join' }, refresh)
      .on('presence', { event: 'leave' }, refresh)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            joined_at: new Date().toISOString(),
          })
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
      </span>
      <Users className="h-3 w-3 text-white/50" />
      <span className="text-white/80 tabular-nums">
        {count == null ? '—' : count.toLocaleString()}
      </span>
      <span className="text-white/40">watching</span>
    </div>
  )
}
