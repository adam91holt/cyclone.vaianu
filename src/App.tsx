import { useEffect, useRef, useState, useCallback, lazy, Suspense } from 'react'
// ^ useEffect is used for the moreOpen body-lock and the #admin hash listener
import {
  LayoutDashboard,
  CloudRain,
  Plane,
  Newspaper,
  History,
  Terminal,
  CloudSun,
  Video,
  Zap,
  Construction,
  Waves,
  Clock,
  Sparkles,
  MoreHorizontal,
  X,
  Camera,
} from 'lucide-react'
import { AlertBar } from '@/components/AlertBar'
import { Header } from '@/components/Header'
import { HeroWind } from '@/components/HeroWind'
import { StatCards } from '@/components/StatCards'
import { RegionsPanel } from '@/components/RegionsPanel'
import { NewsTicker } from '@/components/NewsTicker'
import { CycloneMap } from '@/components/CycloneMap'
import { RegionalWeather } from '@/components/RegionalWeather'
import { AIBriefing } from '@/components/AIBriefing'
import { SummaryHistory } from '@/components/SummaryHistory'
import { AirportsPanel } from '@/components/AirportsPanel'
import { ApiDocs } from '@/components/ApiDocs'
import { MetServiceNationalWarnings } from '@/components/MetServiceNationalWarnings'
import { NewsFeed } from '@/components/NewsFeed'
import { WeatherCharts } from '@/components/WeatherCharts'
import { NiwaVideoCard } from '@/components/NiwaVideoCard'
import { NiwaForecast } from '@/components/NiwaForecast'
import { NiwaTweets } from '@/components/NiwaTweets'
import { StuffLiveblog } from '@/components/StuffLiveblog'
import { NzhLiveblog } from '@/components/NzhLiveblog'
import { FeedHealth } from '@/components/FeedHealth'
import { CivilDefenceAlerts } from '@/components/CivilDefenceAlerts'
import { Timeline } from '@/components/Timeline'
import { RegionProvider } from '@/context/RegionContext'
import { SignupPopup } from '@/components/SignupPopup'
import { CrowdReports } from '@/components/CrowdReports'
import { AdminReports } from '@/components/AdminReports'
import { SubmitReportFab } from '@/components/SubmitReportFab'
// Lazy-loaded — each carries a heavy dependency (hls.js, leaflet,
// react-markdown) we don't want on the critical path.
const WebcamsPanel = lazy(() =>
  import('@/components/WebcamsPanel').then((m) => ({ default: m.WebcamsPanel })),
)
const OutagesMap = lazy(() =>
  import('@/components/OutagesMap').then((m) => ({ default: m.OutagesMap })),
)
const RoadEventsMap = lazy(() =>
  import('@/components/RoadEventsMap').then((m) => ({ default: m.RoadEventsMap })),
)
const RiversMap = lazy(() =>
  import('@/components/RiversMap').then((m) => ({ default: m.RiversMap })),
)
const ComprehensiveReport = lazy(() =>
  import('@/components/ComprehensiveReport').then((m) => ({
    default: m.ComprehensiveReport,
  })),
)

type TabKey =
  | 'dashboard'
  | 'timeline'
  | 'report'
  | 'weather'
  | 'webcams'
  | 'outages'
  | 'roads'
  | 'rivers'
  | 'reports'
  | 'niwa'
  | 'flights'
  | 'news'
  | 'archive'
  | 'api'

interface TabDef {
  key: TabKey
  label: string
  icon: React.ComponentType<{ className?: string }>
  sub: string
  /** Hide from the mobile bottom bar entirely (still shown in the desktop sidebar). */
  desktopOnly?: boolean
  /**
   * Pin to the 4-slot primary mobile bottom bar. Non-pinned mobile tabs
   * live behind the "More" bottom sheet.
   */
  mobilePrimary?: boolean
}

const TABS: TabDef[] = [
  { key: 'dashboard', label: 'Live Map', icon: LayoutDashboard, sub: 'Windy + regions', mobilePrimary: true },
  { key: 'reports', label: 'Ground Reports', icon: Camera, sub: 'Submit + photos' },
  { key: 'timeline', label: 'Timeline', icon: Clock, sub: 'Notable events · live' },
  { key: 'report', label: 'Opus Report', icon: Sparkles, sub: 'Hourly · Claude Opus 4.6', mobilePrimary: true },
  { key: 'weather', label: 'Warnings', icon: CloudRain, sub: 'MetService + Open-Meteo', mobilePrimary: true },
  { key: 'webcams', label: 'Webcams', icon: Video, sub: 'Live landfall zone' },
  { key: 'outages', label: 'Outages', icon: Zap, sub: 'Power · live', mobilePrimary: true },
  { key: 'roads', label: 'Roads', icon: Construction, sub: 'NZTA · live' },
  { key: 'rivers', label: 'Rivers', icon: Waves, sub: '1,700+ gauges · 10m' },
  { key: 'niwa', label: 'NIWA', icon: CloudSun, sub: '8-day + @NiwaWeather' },
  { key: 'flights', label: 'Flights', icon: Plane, sub: 'Live ADS-B', desktopOnly: true },
  { key: 'news', label: 'News', icon: Newspaper, sub: 'RNZ · Stuff · NZH' },
  { key: 'archive', label: 'Archive', icon: History, sub: 'All AI reports' },
  { key: 'api', label: 'Public API', icon: Terminal, sub: 'Summary endpoint', desktopOnly: true },
]

const MOBILE_PRIMARY_TABS = TABS.filter((t) => t.mobilePrimary)
const MOBILE_MORE_TABS = TABS.filter((t) => !t.desktopOnly && !t.mobilePrimary)

function TabLoading({ label }: { label: string }) {
  return (
    <div className="bg-[#0f1729]/80 border border-white/10 rounded-lg h-[520px] flex items-center justify-center">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-white/50 font-mono">
        <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        {label}
      </div>
    </div>
  )
}

function App() {
  const [tab, setTab] = useState<TabKey>('dashboard')
  const [moreOpen, setMoreOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(
    () => typeof window !== 'undefined' && window.location.hash === '#admin',
  )
  const sectionRef = useRef<HTMLDivElement>(null)

  // #admin in the URL bar flips us into the moderation view.
  useEffect(() => {
    function onHashChange() {
      setIsAdmin(window.location.hash === '#admin')
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  if (isAdmin) {
    return <AdminReports />
  }

  const switchTab = useCallback((key: TabKey) => {
    setTab(key)
    setMoreOpen(false)
    // Let React render the new tab content, then scroll to it
    requestAnimationFrame(() => {
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [])

  // Lock body scroll while the mobile More sheet is open
  useEffect(() => {
    if (!moreOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [moreOpen])

  const moreTabActive = MOBILE_MORE_TABS.some((t) => t.key === tab)

  return (
    <RegionProvider>
    <div className="min-h-screen bg-[#070b16] text-white selection:bg-red-500/30 overflow-x-hidden">
      <AlertBar />
      <Header hideShareMobileFab={tab === 'reports'} />
      <NewsTicker />

      <main className="mx-auto max-w-[1500px] px-4 sm:px-6 py-5 pb-24 lg:pb-5 space-y-4">
        {/* Top band — AI situation report + NIWA video forecast side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-8">
            <AIBriefing onOpenReport={() => switchTab('report')} />
          </div>
          <div className="lg:col-span-4">
            <NiwaVideoCard />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
          <div className="lg:col-span-5 flex">
            <HeroWind />
          </div>
          <div className="lg:col-span-7 flex flex-col gap-3">
            <StatCards />
          </div>
        </div>

        {/* Tabs row — sidebar on desktop, content area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* Desktop sidebar — hidden on mobile */}
          <aside className="hidden lg:block lg:col-span-2">
            <nav className="bg-[#0f1729]/80 border border-white/10 rounded-lg p-2 flex flex-col gap-1">
              {TABS.map(({ key, label, icon: Icon, sub }) => {
                const active = tab === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => switchTab(key)}
                    className={`group text-left rounded-md px-3 py-2.5 transition-all border ${
                      active
                        ? 'bg-red-500/15 border-red-500/40 text-white'
                        : 'bg-transparent border-transparent text-white/60 hover:bg-white/[0.04] hover:text-white/90'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon
                        className={`h-3.5 w-3.5 shrink-0 ${
                          active ? 'text-red-300' : 'text-white/50 group-hover:text-white/80'
                        }`}
                      />
                      <span className="text-[11px] font-bold uppercase tracking-wider">
                        {label}
                      </span>
                    </div>
                    <div className="text-[9px] text-white/35 font-mono uppercase tracking-wider mt-0.5 pl-5">
                      {sub}
                    </div>
                  </button>
                )
              })}
            </nav>
          </aside>

          <section ref={sectionRef} className="lg:col-span-10 min-w-0 space-y-3 scroll-mt-4">
            {tab === 'dashboard' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                <div className="lg:col-span-9">
                  <CycloneMap />
                </div>
                <div className="lg:col-span-3">
                  <RegionsPanel />
                </div>
              </div>
            )}

            {tab === 'timeline' && <Timeline />}

            {tab === 'report' && (
              <Suspense fallback={<TabLoading label="Loading Opus report…" />}>
                <ComprehensiveReport />
              </Suspense>
            )}

            {tab === 'weather' && (
              <>
                <CivilDefenceAlerts />
                <MetServiceNationalWarnings />
                <RegionalWeather />
                <WeatherCharts />
              </>
            )}

            {tab === 'webcams' && (
              <Suspense fallback={<TabLoading label="Loading webcams…" />}>
                <WebcamsPanel />
              </Suspense>
            )}

            {tab === 'outages' && (
              <Suspense fallback={<TabLoading label="Loading outages map…" />}>
                <OutagesMap />
              </Suspense>
            )}

            {tab === 'roads' && (
              <Suspense fallback={<TabLoading label="Loading road events…" />}>
                <RoadEventsMap />
              </Suspense>
            )}

            {tab === 'rivers' && (
              <Suspense fallback={<TabLoading label="Loading river gauges…" />}>
                <RiversMap />
              </Suspense>
            )}

            {tab === 'reports' && <CrowdReports />}

            {tab === 'niwa' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <NiwaForecast />
                <NiwaTweets />
              </div>
            )}

            {tab === 'flights' && <AirportsPanel />}

            {tab === 'news' && (
              <>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <StuffLiveblog />
                  <NzhLiveblog />
                </div>
                <NewsFeed />
              </>
            )}

            {tab === 'archive' && <SummaryHistory />}

            {tab === 'api' && (
              <>
                <FeedHealth />
                <ApiDocs />
              </>
            )}
          </section>
        </div>
      </main>

      {/* Mobile bottom tab bar — 4 primary tabs + a More button that opens
          a bottom sheet with the rest. Keeps touch targets readable. */}
      <nav className="fixed bottom-0 inset-x-0 z-50 lg:hidden bg-[#070b16]/95 backdrop-blur-md border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-stretch justify-around">
          {MOBILE_PRIMARY_TABS.map(({ key, label, icon: Icon }) => {
            const active = tab === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => switchTab(key)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${
                  active ? 'text-red-400' : 'text-white/40 active:text-white/70'
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? 'text-red-400' : ''}`} />
                <span className="text-[9px] font-bold uppercase tracking-wider">
                  {label}
                </span>
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${
              moreTabActive || moreOpen
                ? 'text-red-400'
                : 'text-white/40 active:text-white/70'
            }`}
            aria-label="More tabs"
            aria-expanded={moreOpen}
          >
            <MoreHorizontal
              className={`h-5 w-5 ${moreTabActive || moreOpen ? 'text-red-400' : ''}`}
            />
            <span className="text-[9px] font-bold uppercase tracking-wider">More</span>
          </button>
        </div>
      </nav>

      {/* Mobile "More" bottom sheet */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-[60] lg:hidden"
          onClick={() => setMoreOpen(false)}
        >
          {/* backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150" />

          {/* sheet */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-0 bottom-0 bg-[#0a1020] border-t border-white/10 rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-200"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 5rem)' }}
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-white/60">
                  More tabs
                </div>
                <div className="text-[9px] text-white/35 font-mono uppercase tracking-wider">
                  Tap any to switch
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="h-8 w-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/60"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 px-4 pb-4">
              {MOBILE_MORE_TABS.map(({ key, label, icon: Icon, sub }) => {
                const active = tab === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => switchTab(key)}
                    className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all active:scale-[0.98] ${
                      active
                        ? 'border-red-500/40 bg-red-500/10'
                        : 'border-white/10 bg-white/[0.02] active:bg-white/[0.06]'
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 ${active ? 'text-red-300' : 'text-white/60'}`}
                    />
                    <div
                      className={`text-[11px] font-bold uppercase tracking-wider ${
                        active ? 'text-white' : 'text-white/85'
                      }`}
                    >
                      {label}
                    </div>
                    <div className="text-[9px] font-mono text-white/40 uppercase tracking-wider leading-tight line-clamp-2">
                      {sub}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <footer className="max-w-[1500px] mx-auto px-6 py-8 text-[10px] uppercase tracking-wider text-white/30 font-mono">
        Data: Open-Meteo · MetService · NIWA · Windy.com · adsb.lol · RNZ / Stuff / NZ Herald · AI rollups by Claude Sonnet 4.6 · Built by{' '}
        <a
          href="https://thecolab.ai/"
          target="_blank"
          rel="noreferrer"
          className="text-white/50 hover:text-white/80 transition-colors underline-offset-2 hover:underline"
        >
          thecolab.ai
        </a>
      </footer>
      <SubmitReportFab hidden={tab === 'reports'} />
      <SignupPopup disabled={tab === 'reports'} />
    </div>
    </RegionProvider>
  )
}

export default App
