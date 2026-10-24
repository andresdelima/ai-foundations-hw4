import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import ChatResults from '../components/ChatResults'
import ProductCard from '../components/ProductCard'
import { useChat } from '../chatContext'
import { useProducts } from '../useProducts'

type Sort = 'featured' | 'price-asc' | 'price-desc' | 'name'

export default function Products() {
  const { data, error, loading } = useProducts()
  const { pageResults } = useChat()
  const [params, setParams] = useSearchParams()
  const category = params.get('category') ?? ''
  const collection = params.get('collection') ?? ''
  const q = params.get('q') ?? ''
  const sort = (params.get('sort') ?? 'featured') as Sort

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const visible = useMemo(() => {
    if (!data) return []
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean)
    const list = data.products.filter((p) => {
      if (category && p.category !== category) return false
      if (collection && p.collection !== collection) return false
      const haystack = [p.name, p.description, p.garment_type, ...p.colors, ...p.search_tags].join(' ').toLowerCase()
      return terms.every((t) => haystack.includes(t))
    })
    if (sort === 'price-asc') list.sort((a, b) => a.price - b.price)
    if (sort === 'price-desc') list.sort((a, b) => b.price - a.price)
    if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name))
    return list
  }, [data, category, collection, q, sort])

  // A chat search replaces the catalogue view until the shopper clears it.
  if (pageResults) {
    return (
      <div className="container page">
        <ChatResults results={pageResults} />
      </div>
    )
  }

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Shop</span>
          <h1>{collection || category || 'All products'}</h1>
          {data && (
            <p className="muted">
              Showing {visible.length} of {data.count} styles
            </p>
          )}
        </div>
        <input
          className="search"
          type="search"
          placeholder="Search hoodies, colleges, colors…"
          value={q}
          onChange={(e) => update('q', e.target.value)}
          aria-label="Search products"
        />
      </div>

      {data && (
        <div className="filters">
          <div className="chips" role="group" aria-label="Category">
            <button className={`chip ${!category ? 'active' : ''}`} onClick={() => update('category', '')}>
              All
            </button>
            {data.categories.map((c) => (
              <button key={c} className={`chip ${category === c ? 'active' : ''}`} onClick={() => update('category', c)}>
                {c}
              </button>
            ))}
          </div>
          <div className="selects">
            <select value={collection} onChange={(e) => update('collection', e.target.value)} aria-label="Collection">
              <option value="">All collections</option>
              {data.collections.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select value={sort} onChange={(e) => update('sort', e.target.value === 'featured' ? '' : e.target.value)} aria-label="Sort">
              <option value="featured">Sort: Featured</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>
      )}

      {loading && <p className="muted">Loading the catalogue…</p>}
      {error && <p className="error">Couldn't load products: {error}. Is the backend running?</p>}
      {data && visible.length === 0 && <p className="muted">No products match those filters yet. Try a different search.</p>}

      <div className="product-grid">
        {visible.map((p) => (
          <ProductCard key={p.product_id} product={p} />
        ))}
      </div>
    </div>
  )
}
