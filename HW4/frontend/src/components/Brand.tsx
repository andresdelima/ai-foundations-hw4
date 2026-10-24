import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

/** Handsome Dan-style bulldog mark: the shop's mascot, used in the logo, chat, and empty states. */
export function BulldogMark({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <svg className={`bulldog-mark ${className}`} width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <circle cx="32" cy="32" r="31" fill="#00356b" />
      <circle cx="32" cy="32" r="27.5" fill="none" stroke="#fff" strokeWidth="1.2" strokeDasharray="2.2 2.2" opacity=".55" />
      {/* ears */}
      <path d="M14 22 C12 14, 20 12, 24 18 Z" fill="#dfe7f1" />
      <path d="M50 22 C52 14, 44 12, 40 18 Z" fill="#dfe7f1" />
      {/* head */}
      <ellipse cx="32" cy="33" rx="18" ry="16" fill="#fff" />
      {/* brow wrinkles */}
      <path d="M25 24 Q32 21 39 24" stroke="#00356b" strokeWidth="1.3" fill="none" strokeLinecap="round" opacity=".55" />
      {/* eyes */}
      <circle cx="25" cy="30" r="2.6" fill="#0a1f3d" />
      <circle cx="39" cy="30" r="2.6" fill="#0a1f3d" />
      <circle cx="25.8" cy="29.2" r=".8" fill="#fff" />
      <circle cx="39.8" cy="29.2" r=".8" fill="#fff" />
      {/* jowls */}
      <ellipse cx="25.5" cy="40" rx="8.5" ry="6.5" fill="#fff" stroke="#00356b" strokeWidth="1.2" />
      <ellipse cx="38.5" cy="40" rx="8.5" ry="6.5" fill="#fff" stroke="#00356b" strokeWidth="1.2" />
      {/* nose */}
      <ellipse cx="32" cy="35.5" rx="5" ry="3.4" fill="#0a1f3d" />
      {/* underbite teeth */}
      <path d="M27.5 44.5 l1.4 -2.6 l1.4 2.6 M33.7 44.5 l1.4 -2.6 l1.4 2.6" stroke="#0a1f3d" strokeWidth="1" fill="#fff" />
      {/* collar Y */}
      <text x="32" y="58" textAnchor="middle" fontFamily="Graduate, Georgia, serif" fontSize="8" fill="#fff">
        Y
      </text>
    </svg>
  )
}

/** Rotating circular "seal" stamp, like the license badge on a shop window. */
export function Stamp({ text, size = 120, children }: { text: string; size?: number; children?: ReactNode }) {
  const id = `stamp-${text.length}-${size}`
  return (
    <div className="stamp" style={{ width: size, height: size }} aria-hidden>
      <svg viewBox="0 0 100 100" className="stamp-ring">
        <defs>
          <path id={id} d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" />
        </defs>
        <text>
          {/* slogans are sized (font + letter-spacing in theme.css) to fit the ring (circumference ≈ 238) */}
          <textPath href={`#${id}`} startOffset="0">
            {text}
          </textPath>
        </text>
      </svg>
      <div className="stamp-center">{children}</div>
    </div>
  )
}

/** Endless scrolling band of words (residential colleges, slogans). */
export function Marquee({ items, variant = 'navy' }: { items: string[]; variant?: 'navy' | 'cream' }) {
  const row = items.map((t, i) => (
    <span key={i} className="marquee-item">
      {t}
      <span className="marquee-dot">✦</span>
    </span>
  ))
  return (
    <div className={`marquee marquee-${variant}`} aria-hidden>
      <div className="marquee-track">
        {row}
        {row}
      </div>
    </div>
  )
}

/** Fades and lifts its children into view the first time they scroll on screen. */
export function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      { threshold: 0.12 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div ref={ref} className={`reveal ${shown ? 'in' : ''} ${className}`} style={{ '--d': `${delay}ms` } as CSSProperties}>
      {children}
    </div>
  )
}
