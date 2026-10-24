import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { formatPrice, type Product } from '../api'
import { useChat } from '../chatContext'
import { useProducts } from '../useProducts'

const MAX_SUGGESTIONS = 6

function score(p: Product, terms: string[]): number {
  const name = p.name.toLowerCase()
  const hay = [p.name, p.category, p.collection, p.garment_type, ...p.colors, ...p.search_tags].join(' ').toLowerCase()
  let s = 0
  for (const t of terms) {
    if (!hay.includes(t)) return 0 // every word must match somewhere
    s += name.includes(t) ? 3 : 1
    if (name.startsWith(t)) s += 2
  }
  return s
}

// Instant search in the header: results appear as you type (image, name, price),
// with keyboard support. Enter on the text goes to the full filtered Products page.
export default function HeaderSearch({ onNavigate }: { onNavigate?: () => void }) {
  const { data } = useProducts()
  const { clearPageResults } = useChat()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const boxRef = useRef<HTMLDivElement>(null)

  const terms = q.toLowerCase().trim().replace('grey', 'gray').split(/\s+/).filter(Boolean)
  const matches = useMemo(() => {
    if (!data || terms.length === 0) return []
    return data.products
      .map((p) => ({ p, s: score(p, terms) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s || a.p.name.localeCompare(b.p.name))
      .map((x) => x.p)
  }, [data, q])
  const shown = matches.slice(0, MAX_SUGGESTIONS)

  useEffect(() => {
    setOpen(false)
    setQ('')
  }, [pathname])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function goToProduct(p: Product) {
    navigate(`/products/${p.product_id}`)
    onNavigate?.()
  }

  function goToAll() {
    if (!q.trim()) return
    clearPageResults()
    navigate(`/products?q=${encodeURIComponent(q.trim())}`)
    onNavigate?.()
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((a) => Math.min(a + 1, shown.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (active >= 0 && active < shown.length) goToProduct(shown[active])
      else goToAll()
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="header-search" ref={boxRef}>
      <span className="header-search-icon" aria-hidden>
        🔍
      </span>
      <input
        type="search"
        value={q}
        placeholder="Search hoodies, colleges, colors…"
        aria-label="Search products"
        aria-expanded={open && q.length > 0}
        aria-controls="header-search-results"
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
          setActive(-1)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {open && terms.length > 0 && (
        <div className="search-dropdown" id="header-search-results" role="listbox">
          {shown.length === 0 ? (
            <p className="search-empty">
              No matches for “{q}”. Try a college, sport, or color, or ask the Bulldog in chat.
            </p>
          ) : (
            shown.map((p, i) => (
              <button
                key={p.product_id}
                role="option"
                aria-selected={i === active}
                className={`search-option ${i === active ? 'active' : ''}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => goToProduct(p)}
              >
                <img src={p.image_url} alt="" />
                <span className="search-option-text">
                  <strong>{p.name}</strong>
                  <small>
                    {p.category} · {p.total_stock > 0 ? 'In stock' : 'Sold out'}
                  </small>
                </span>
                <span className="price">{formatPrice(p.price)}</span>
              </button>
            ))
          )}
          {matches.length > 0 && (
            <button
              className={`search-all ${active === shown.length ? 'active' : ''}`}
              onMouseEnter={() => setActive(shown.length)}
              onClick={goToAll}
            >
              See all {matches.length} results for “{q.trim()}” →
            </button>
          )}
        </div>
      )}
    </div>
  )
}
