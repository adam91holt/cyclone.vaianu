import { useState } from 'react'
import { Camera } from 'lucide-react'
import { SubmitReportModal } from '@/components/SubmitReportModal'

/**
 * Mobile-only floating action button that opens the Ground Reports
 * submit modal from anywhere in the app. Sits at bottom-left, mirrored
 * across from the ShareButton FAB which lives at bottom-right. Both
 * are offset upwards so they clear the fixed mobile tab bar.
 */
export function SubmitReportFab() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Submit a ground report"
        className="sm:hidden fixed z-[90] h-14 w-14 rounded-full border border-sky-400/50 bg-sky-600 text-white shadow-[0_8px_24px_rgba(14,165,233,0.45),0_2px_8px_rgba(0,0,0,0.6)] active:scale-95 active:bg-sky-500 hover:bg-sky-500 transition-all flex items-center justify-center ring-4 ring-sky-500/15 hover:ring-sky-500/30"
        style={{
          left: 'max(1rem, env(safe-area-inset-left))',
          bottom: 'calc(4.5rem + env(safe-area-inset-bottom))',
        }}
      >
        <Camera className="h-5 w-5" strokeWidth={2.4} />
      </button>

      <SubmitReportModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
