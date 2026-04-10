import { useState } from 'react'
import {
  LayoutDashboard,
  CloudRain,
  Plane,
  Newspaper,
  History,
  Terminal,
  CloudSun,
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
import { FeedHealth } from '@/components/FeedHealth'

type TabKey = 'dashboard' | 'weather' | 'niwa' | 'flights' | 'news' | 'archive' | 'api'

interface TabDef {
  key: TabKey
  label: string
  icon: React.ComponentType<{ className?: string }>
  sub: string
}

const TABS: TabDef[] = [
  { key: 'dashboard', label: 'Live Map', icon: LayoutDashboard, sub: 'Windy + regions' },
  { key: 'weather', label: 'Warnings', icon: CloudRain, sub: 'MetService + Open-Meteo' },
  { key: 'niwa', label: 'NIWA', icon: CloudSun, sub: '8-day + @NiwaWeather' },
  { key: 'flights', label: 'Flights', icon: Plane, sub: 'Live ADS-B' },
  { key: 'news', label: 'News', icon: Newspaper, sub: 'RNZ · Stuff · NZH' },
  { key: 'archive', label: 'Archive', icon: History, sub: 'All AI reports' },
  { key: 'api', label: 'Public API', icon: Terminal, sub: 'Summary endpoint' },
]

function App() {
  const [tab, setTab] = useState<TabKey>('dashboard')

  return (
    <div className="min-h-screen bg-[#070b16] text-white selection:bg-red-500/30">
      <AlertBar />
      <Header />
      <NewsTicker />

      <main className="mx-auto max-w-[1500px] px-4 sm:px-6 py-5 space-y-4">
        {/* Top band — AI situation report + NIWA video forecast side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-8">
            <AIBriefing />
          </div>
          <div className="lg:col-span-4">
            <NiwaVideoCard />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-5">
            <HeroWind />
          </div>
          <div className="lg:col-span-7 grid grid-cols-1 gap-3">
            <StatCards />
          </div>
        </div>

        {/* Tabs row — sidebar on the left, content on the right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <aside className="lg:col-span-2">
            <nav className="bg-[#0f1729]/80 border border-white/10 rounded-lg p-2 flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
              {TABS.map(({ key, label, icon: Icon, sub }) => {
                const active = tab === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTab(key)}
                    className={`group shrink-0 lg:shrink text-left rounded-md px-3 py-2.5 transition-all border ${
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
                    <div className="hidden lg:block text-[9px] text-white/35 font-mono uppercase tracking-wider mt-0.5 pl-5">
                      {sub}
                    </div>
                  </button>
                )
              })}
            </nav>
          </aside>

          <section className="lg:col-span-10 min-w-0 space-y-3">
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

            {tab === 'weather' && (
              <>
                <MetServiceNationalWarnings />
                <RegionalWeather />
                <WeatherCharts />
              </>
            )}

            {tab === 'niwa' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <NiwaForecast />
                <NiwaTweets />
              </div>
            )}

            {tab === 'flights' && <AirportsPanel />}

            {tab === 'news' && (
              <>
                <StuffLiveblog />
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
    </div>
  )
}

export default App
