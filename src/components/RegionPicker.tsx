import { useEffect, useRef, useState } from 'react'
import { MapPin, Check, ChevronDown } from 'lucide-react'
import { REGION_OPTIONS } from '@/lib/cyclone'
import { useSelectedRegion } from '@/context/RegionContext'

/** Compact region selector chip — dropdown listing "All NZ" + the 6 canonical
 *  cyclone impact regions. Persists to localStorage via RegionContext. */
export function RegionPicker() {
  const { regionId, label, isFiltered, setRegionId } = useSelectedRegion()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`group flex items-center gap-1.5 rounded-sm border px-2 py-0.5 transition-colors ${
          isFiltered
            ? 'bg-sky-500/15 border-sky-500/40 text-sky-200 hover:bg-sky-500/20'
            : 'bg-white/5 border-white/15 text-white/70 hover:bg-white/10 hover:text-white'
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <MapPin className="h-3 w-3" />
        <span className="text-[10px] font-bold uppercase tracking-[0.15em]">
          {label}
        </span>
        <ChevronDown
          className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-full mt-1.5 z-30 min-w-[180px] rounded-md border border-white/15 bg-[#0a0f1e]/95 backdrop-blur-sm shadow-xl overflow-hidden"
        >
          <div className="px-3 pt-2 pb-1 text-[9px] uppercase tracking-[0.18em] font-mono text-white/40 border-b border-white/5">
            Focus Region
          </div>
          <ul className="py-1">
            {REGION_OPTIONS.map((opt) => {
              const active = opt.id === regionId
              return (
                <li key={opt.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      setRegionId(opt.id)
                      setOpen(false)
                    }}
                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] font-medium transition-colors ${
                      active
                        ? 'bg-sky-500/15 text-sky-200'
                        : 'text-white/75 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span className="font-mono uppercase tracking-wider text-[9px] w-8 shrink-0 text-white/45">
                      {opt.short}
                    </span>
                    <span className="flex-1">{opt.label}</span>
                    {active && <Check className="h-3 w-3 text-sky-300" />}
                  </button>
                </li>
              )
            })}
          </ul>
          <div className="px-3 py-1.5 text-[9px] text-white/35 border-t border-white/5 leading-relaxed">
            Localizes peak wind, rainfall &amp; pressure.
          </div>
        </div>
      )}
    </div>
  )
}
