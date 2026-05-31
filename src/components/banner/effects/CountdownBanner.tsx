import { useEffect, useState } from "react"

interface Props {
  expiresAt: string
  label: string
  textColor: string
  onExpired: () => void
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export default function CountdownBanner({ expiresAt, label, textColor, onExpired }: Props) {
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0, expired: false })

  useEffect(() => {
    const calc = () => {
      const diff = new Date(expiresAt).getTime() - Date.now()
      if (diff <= 0) {
        setTimeLeft({ h: 0, m: 0, s: 0, expired: true })
        onExpired()
        return
      }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimeLeft({ h, m, s, expired: false })
    }
    calc()
    const interval = setInterval(calc, 1000)
    return () => clearInterval(interval)
  }, [expiresAt, onExpired])

  if (timeLeft.expired) return null

  return (
    <div className="absolute bottom-3 left-0 right-0 flex flex-col items-center gap-0.5 pointer-events-none z-10">
      {label && (
        <span className="text-[10px] uppercase tracking-widest opacity-60" style={{ color: textColor }}>
          {label}
        </span>
      )}
      <div className="flex items-center gap-1">
        {[
          { val: timeLeft.h, unit: 'h' },
          { val: timeLeft.m, unit: 'm' },
          { val: timeLeft.s, unit: 's' },
        ].map(({ val, unit }) => (
          <div key={unit} className="flex flex-col items-center">
            <span
              className="text-lg font-black tabular-nums leading-none"
              style={{ color: textColor }}
            >
              {pad(val)}
            </span>
            <span className="text-[9px] opacity-50" style={{ color: textColor }}>{unit}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
