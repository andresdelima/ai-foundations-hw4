import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, formatPrice } from '../api'
import { useBag } from '../bagContext'

// Slide-out bag. Opening it re-reads stock and prices from the database so the
// bag never promises units the shop no longer has.
export default function BagDrawer() {
  const { items, open, setOpen, setQty, remove, refreshStock, subtotal, count } = useBag()
  const [checking, setChecking] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!open || items.length === 0) return
    let alive = true
    setChecking(true)
    const ids = [...new Set(items.map((i) => i.product_id))]
    Promise.all(ids.map((id) => api.product(id).catch(() => null)))
      .then((products) => {
        if (!alive) return
        const updates = products.flatMap((p) =>
          p ? (p.sizes ?? []).map((s) => ({ product_id: p.product_id, size: s.size, max: s.quantity, price: p.price })) : [],
        )
        const shrunk = items.filter((i) => {
          const u = updates.find((x) => x.product_id === i.product_id && x.size === i.size)
          return u && u.max < i.qty
        })
        refreshStock(updates)
        setNotice(shrunk.length ? 'Stock changed for some items, so we adjusted their quantities.' : null)
      })
      .finally(() => alive && setChecking(false))
    return () => {
      alive = false
    }
    // Only when the drawer opens; items changes inside it are handled locally.
  }, [open])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  if (!open) return null

  return (
    <div className="bag-overlay" onClick={() => setOpen(false)}>
      <aside className="bag-drawer" role="dialog" aria-label="Shopping bag" onClick={(e) => e.stopPropagation()}>
        <header className="bag-head">
          <h2>Your bag {count > 0 && <span className="muted">({count})</span>}</h2>
          <button className="bag-close" aria-label="Close bag" onClick={() => setOpen(false)}>
            ×
          </button>
        </header>

        {checking && <p className="bag-status">Checking live stock…</p>}
        {notice && <p className="bag-notice">{notice}</p>}

        {items.length === 0 ? (
          <div className="bag-empty">
            <p>Your bag is empty.</p>
            <Link to="/products" className="btn btn-primary" onClick={() => setOpen(false)}>
              Browse products
            </Link>
          </div>
        ) : (
          <ul className="bag-items">
            {items.map((i) => (
              <li key={`${i.product_id}-${i.size}`} className="bag-item">
                <Link to={`/products/${i.product_id}`} onClick={() => setOpen(false)}>
                  <img src={i.image_url} alt={i.name} />
                </Link>
                <div className="bag-item-info">
                  <Link to={`/products/${i.product_id}`} onClick={() => setOpen(false)} className="bag-item-name">
                    {i.name}
                  </Link>
                  <span className="muted small">Size {i.size} · {formatPrice(i.price)}</span>
                  {i.max <= 0 ? (
                    <span className="bag-warn">Sold out now. Please remove.</span>
                  ) : (
                    <div className="qty">
                      <button aria-label="Decrease" onClick={() => setQty(i.product_id, i.size, i.qty - 1)} disabled={i.qty <= 1}>
                        −
                      </button>
                      <span aria-live="polite">{i.qty}</span>
                      <button aria-label="Increase" onClick={() => setQty(i.product_id, i.size, i.qty + 1)} disabled={i.qty >= i.max}>
                        +
                      </button>
                      {i.qty >= i.max && <span className="bag-max">max {i.max} in stock</span>}
                    </div>
                  )}
                </div>
                <div className="bag-item-right">
                  <strong>{formatPrice(i.qty * i.price)}</strong>
                  <button className="link-btn" onClick={() => remove(i.product_id, i.size)}>
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {items.length > 0 && (
          <footer className="bag-foot">
            <div className="bag-total">
              <span>Subtotal</span>
              <strong>{formatPrice(subtotal)}</strong>
            </div>
            <p className="muted small">
              Made to order: most items print in 5–8 business days. Shipping is calculated at checkout.
            </p>
            <button className="btn btn-primary btn-block" disabled title="Online checkout launches soon">
              Checkout (coming soon)
            </button>
            <p className="muted small center">Your bag is saved on this device.</p>
          </footer>
        )}
      </aside>
    </div>
  )
}
