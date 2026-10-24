import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { formatPrice, shortText, type CardProduct } from '../api'

// One product card, used by the catalogue, the home page, chat bubbles, and
// chat search results. Every card links to the single-item page.
export default function ProductCard({
  product,
  compact = false,
  index,
}: {
  product: CardProduct
  compact?: boolean
  /** Position in a grid; staggers the entrance animation for chat results. */
  index?: number
}) {
  const low = product.total_stock > 0 && product.total_stock <= 20
  const style = index === undefined ? undefined : ({ '--i': Math.min(index, 20) } as CSSProperties)
  return (
    <Link
      to={`/products/${product.product_id}`}
      className={`product-card ${compact ? 'compact' : ''}`}
      style={style}
      data-product-id={product.product_id}
    >
      <div className="product-card-img">
        <img src={product.image_url} alt={product.name} loading="lazy" />
        {low && <span className="badge badge-accent">Low stock</span>}
        {!compact && (
          <span className="hang-tag" aria-hidden>
            <span className="hang-tag-string" />
            {formatPrice(product.price)}
          </span>
        )}
        {!compact && <span className="card-cta">View details →</span>}
      </div>
      <div className="product-card-body">
        <span className="eyebrow">{product.category}</span>
        <h3>{product.name}</h3>
        {!compact && <p>{shortText(product.description)}</p>}
        {!compact && product.in_stock_sizes && (
          <span className="card-sizes">
            {product.in_stock_sizes.length > 0 ? `Sizes: ${product.in_stock_sizes.join(' · ')}` : 'Sold out'}
          </span>
        )}
        <span className="price">{formatPrice(product.price)}</span>
      </div>
    </Link>
  )
}
