import { forwardRef } from 'react'
import { Wind } from 'lucide-react'

export interface ShareCardData {
  landfallText: string
  landfallTime: string
  red: number
  orange: number
  yellow: number
  peakGust: number | null
  peakGustLocation: string | null
}

/**
 * Offscreen 1200x630 social preview card.
 * Rendered via html-to-image → PNG blob.
 * Uses inline styles only (no custom CSS vars) so html-to-image can serialize.
 */
export const ShareCard = forwardRef<HTMLDivElement, { data: ShareCardData }>(
  ({ data }, ref) => {
    return (
      <div
        ref={ref}
        style={{
          width: '1200px',
          height: '630px',
          background:
            'radial-gradient(ellipse at top left, #4a0a0a 0%, #1a0511 30%, #05080f 70%)',
          color: '#ffffff',
          fontFamily:
            "'Space Grotesk', -apple-system, system-ui, sans-serif",
          position: 'relative',
          overflow: 'hidden',
          padding: '56px 64px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        {/* Decorative swirl / noise */}
        <div
          style={{
            position: 'absolute',
            top: '-200px',
            right: '-200px',
            width: '700px',
            height: '700px',
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(239, 68, 68, 0.35) 0%, transparent 65%)',
            filter: 'blur(40px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-150px',
            left: '-100px',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(14, 165, 233, 0.22) 0%, transparent 65%)',
            filter: 'blur(60px)',
          }}
        />

        {/* Top row — badge + credit */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'rgba(220, 38, 38, 0.18)',
              border: '1px solid rgba(248, 113, 113, 0.5)',
              borderRadius: '6px',
              padding: '8px 14px',
            }}
          >
            <Wind size={14} color="#fca5a5" strokeWidth={2.5} />
            <span
              style={{
                fontSize: '13px',
                fontWeight: 700,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: '#fca5a5',
              }}
            >
              Tropical Cyclone · Cat 2
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <img
              src="/thecolab-logo.jpg"
              alt=""
              crossOrigin="anonymous"
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '10px',
                objectFit: 'cover',
              }}
            />
            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  fontSize: '11px',
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.45)',
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                Built by
              </div>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                }}
              >
                thecolab<span style={{ color: '#f87171' }}>.</span>ai
              </div>
            </div>
          </div>
        </div>

        {/* Center — Name + countdown */}
        <div style={{ position: 'relative' }}>
          <h1
            style={{
              fontSize: '184px',
              fontWeight: 800,
              lineHeight: 0.85,
              letterSpacing: '-0.05em',
              margin: 0,
              color: '#ffffff',
            }}
          >
            VAIANU<span style={{ color: '#ef4444' }}>.</span>
          </h1>
          <div
            style={{
              marginTop: '14px',
              fontSize: '19px',
              color: 'rgba(255,255,255,0.55)',
              maxWidth: '720px',
              lineHeight: 1.4,
              fontWeight: 400,
            }}
          >
            Live dashboard tracking impact across the North Island — weather,
            marine, airports, warnings & AI situation reports.
          </div>
        </div>

        {/* Bottom row — countdown + warnings + URL */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: '32px',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '12px',
                letterSpacing: '0.24em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.5)',
                fontFamily: "'JetBrains Mono', monospace",
                marginBottom: '6px',
              }}
            >
              Landfall in
            </div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '72px',
                fontWeight: 700,
                lineHeight: 1,
                letterSpacing: '-0.02em',
                color: '#ffffff',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {data.landfallText}
            </div>
            <div
              style={{
                marginTop: '6px',
                fontSize: '13px',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.4)',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {data.landfallTime}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', gap: '10px' }}>
              {data.red > 0 && (
                <Chip color="#ef4444" count={data.red} label="Red" />
              )}
              {data.orange > 0 && (
                <Chip color="#f59e0b" count={data.orange} label="Orange" />
              )}
              {data.yellow > 0 && (
                <Chip color="#eab308" count={data.yellow} label="Yellow" />
              )}
            </div>
            {data.peakGust && (
              <div
                style={{
                  fontSize: '13px',
                  color: 'rgba(255,255,255,0.55)',
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
              >
                Peak gust{' '}
                <span style={{ color: '#fcd34d', fontWeight: 700 }}>
                  {data.peakGust} km/h
                </span>
                {data.peakGustLocation && ` · ${data.peakGustLocation}`}
              </div>
            )}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.45)',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#f87171',
                  display: 'inline-block',
                }}
              />
              Live updates · vaianu.live
            </div>
          </div>
        </div>
      </div>
    )
  },
)

ShareCard.displayName = 'ShareCard'

function Chip({
  color,
  count,
  label,
}: {
  color: string
  count: number
  label: string
}) {
  return (
    <div
      style={{
        background: `${color}22`,
        border: `1px solid ${color}77`,
        borderRadius: '8px',
        padding: '8px 16px',
        fontSize: '14px',
        fontWeight: 700,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: color,
        fontFamily: "'JetBrains Mono', monospace",
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}
    >
      <span style={{ fontSize: '20px', fontWeight: 800 }}>{count}</span>
      {label}
    </div>
  )
}
