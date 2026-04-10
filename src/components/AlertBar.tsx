import { useEffect, useState } from 'react'

export function AlertBar() {
  const [time, setTime] = useState(() => nzTime())

  useEffect(() => {
    const id = setInterval(() => setTime(nzTime()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="bg-red-600 text-white px-4 py-1.5 flex items-center gap-3 text-[11px] font-bold uppercase tracking-wider">
      <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
      <span>Emergency Alert</span>
      <span className="opacity-80">·</span>
      <span>Red Warning · North Island</span>
      <span className="hidden sm:inline opacity-80">·</span>
      <span className="hidden sm:inline">MetService</span>
      <span className="ml-auto font-mono tabular-nums">{time} NZST</span>
    </div>
  )
}

function nzTime() {
  return new Date().toLocaleTimeString('en-NZ', {
    timeZone: 'Pacific/Auckland',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}
