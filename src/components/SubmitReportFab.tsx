import { useState } from 'react'
import { Camera } from 'lucide-react'
import { SubmitReportModal } from '@/components/SubmitReportModal'

/**
 * Mobile-only floating action button that opens the Ground Reports
 * submit modal from anywhere in the app. Sits at bottom-left, mirrored
 * across from the ShareButton FAB which lives at bottom-right. Both
 * are offset upwards so they clear the fixed mobile tab bar.
 */
interface SubmitReportFabProps {
  /** Hide the floating button (e.g. on the Ground Reports tab where
   *  the submit flow is already in the main content). */
  hidden?: boolean
}

export function SubmitReportFab({ hidden }: SubmitReportFabProps = {}) {
  const [open, setOpen] = useState(false)

  if (hidden) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Submit a ground report"
        className="sm:hidden fixed z-[90] h-10 w-10 rounded-full border border-sky-500/30 bg-[#0a0f1e]/85 backdrop-blur-md text-sky-300 hover:text-sky-200 hover:border-sky-500/50 active:scale-95 active:bg-[#0a0f1e] shadow-md shadow-black/40 transition-all flex items-center justify-center"
        style={{
          left: 'max(0.75rem, env(safe-area-inset-left))',
          bottom: 'calc(4.5rem + env(safe-area-inset-bottom))',
        }}
      >
        <Camera className="h-4 w-4" strokeWidth={2} />
      </button>

      <SubmitReportModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
