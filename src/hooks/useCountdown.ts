import { useEffect, useState } from 'react'

export function useCountdown(targetIso: string) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const target = new Date(targetIso).getTime()
  const delta = Math.max(0, target - now)

  const hours = Math.floor(delta / 3_600_000)
  const minutes = Math.floor((delta % 3_600_000) / 60_000)
  const seconds = Math.floor((delta % 60_000) / 1000)

  const pad = (n: number) => n.toString().padStart(2, '0')

  return {
    total: delta,
    hours,
    minutes,
    seconds,
    formatted: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`,
    isPast: delta === 0,
  }
}
