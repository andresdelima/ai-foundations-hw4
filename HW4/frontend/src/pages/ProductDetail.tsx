import { useEffect, useState, type CSSProperties, type MouseEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, formatPrice, type Product } from '../api'
import { useBag } from '../bagContext'
import { useChat } from '../chatContext'
import { Stamp } from '../components/Brand'
import NotFound from './NotFound'

export default function ProductDetail() {
  const { productId = '' } = useParams()
  const [product, setProduct] = useState<Product | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const { askAbout, setViewing } = useChat()
  const bag = useBag()
  const [bagMessage, setBagMessage] = useState<{ ok: boolean; text: string } | null>(null)
  // Hover-to-zoom: the photo scales 2x around the cursor, like picking a shirt up to look closer.
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null)
  const onZoomMove = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 })
  }

  useEffect(() => {
    let alive = true
    setProduct(null)
    setError(null)
    setSelected(null)
    setBagMessage(null)
    api
      .product(productId)
      .then((p) => alive && setProduct(p))
      .catch((e: Error) => alive && setError(e.message))
    return () => {
      alive = false
    }
  }, [productId])

  // Tell the chat which item is open, so "do you have this in pink?" refers to it.
  useEffect(() => {
    if (!product) return
    setViewing({ product_id: product.product_id, name: product.name })
    return () => setViewing(null)
  }, [product, setViewing])

  if (error) return <NotFound message={error === 'Product not found' ? "That product isn't in our catalogue." : error} />
  if (!product) return <div className="container page muted">Loading…</div>

  const sizes = product.sizes ?? []
  const chosen = sizes.find((s) => s.size === selected)
  const inStock = sizes.filter((s) => s.quantity > 0).map((s) => s.size)

  return (
    <div className="container page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/products">Products</Link> / <Link to={`/products?category=${encodeURIComponent(product.category)}`}>{product.category}</Link> /{' '}
        <span>{product.name}</span>
      </nav>

      <div className="detail">
        <div
          className={`detail-image ${zoom ? 'zooming' : ''}`}
          onMouseMove={onZoomMove}
          onMouseLeave={() => setZoom(null)}
          style={zoom ? ({ '--zx': `${zoom.x}%`, '--zy': `${zoom.y}%` } as CSSProperties) : undefined}
        >
          <img src={product.image_url} alt={product.name} />
          <span className="zoom-hint">{zoom ? 'Move to explore' : '🔍 Hover to zoom'}</span>
          <div className="detail-stamp">
            <Stamp text="MADE TO ORDER ✦ NEW HAVEN, CT ✦ " size={104}>
              <span className="stamp-y">Y</span>
            </Stamp>
          </div>
        </div>

        <div className="detail-info">
          <span className="eyebrow">
            {product.collection} · {product.garment_type}
          </span>
          <h1>{product.name}</h1>
          <p className="detail-price">{formatPrice(product.price)}</p>
          <p className="detail-desc">{product.description}</p>

          <div className="detail-block">
            <h4>Colors</h4>
            <div className="color-list">
              {product.colors.map((c) => (
                <span key={c} className="color-pill">
                  {c}
                </span>
              ))}
            </div>
          </div>

          <div className="detail-block">
            <h4>
              Size {chosen && <span className="muted">· {chosen.size}</span>}
            </h4>
            <div className="size-grid">
              {sizes.map((s) => (
                <button
                  key={s.size}
                  className={`size-btn ${selected === s.size ? 'active' : ''}`}
                  disabled={s.quantity === 0}
                  onClick={() => setSelected(s.size)}
                  title={s.quantity === 0 ? 'Sold out' : `${s.quantity} in stock`}
                >
                  <strong>{s.size}</strong>
                  <small>{s.quantity === 0 ? 'Sold out' : s.quantity <= 3 ? `Only ${s.quantity} left` : `${s.quantity} in stock`}</small>
                </button>
              ))}
            </div>
            <p className="muted small">
              {inStock.length === sizes.length
                ? 'Every size is in stock.'
                : `In stock: ${inStock.join(', ') || 'none right now'}.`}{' '}
              {product.total_stock} units on hand in total.
            </p>
          </div>

          <div className="detail-actions">
            <button
              className="btn btn-primary"
              disabled={!chosen}
              onClick={() => {
                if (!chosen) return
                const r = bag.add({
                  product_id: product.product_id,
                  name: product.name,
                  image_url: product.image_url,
                  price: product.price,
                  size: chosen.size,
                  max: chosen.quantity,
                })
                setBagMessage({ ok: r.ok, text: r.message })
                if (r.ok) bag.setOpen(true)
              }}
            >
              {chosen ? `Add size ${chosen.size} to bag` : 'Select a size'}
            </button>
            <button className="btn btn-outline" onClick={() => askAbout(`Tell me about the ${product.name}. Which sizes are in stock?`)}>
              Ask the Bulldog about this
            </button>
          </div>

          {bagMessage && <p className={bagMessage.ok ? 'bag-added' : 'form-error'}>{bagMessage.text}</p>}

          <ul className="detail-facts">
            <li>Officially licensed Yale apparel</li>
            <li>Made to order, usually printed within 5–8 business days</li>
            <li>30-day returns on unworn items with tags</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
