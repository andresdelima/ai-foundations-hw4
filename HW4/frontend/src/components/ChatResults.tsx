import { useChat, type ChatPageResults } from '../chatContext'
import ProductCard from './ProductCard'

const FILTER_LABELS: Record<string, string> = {
  category: 'Category',
  color: 'Color',
  size_in_stock: 'In stock in',
  max_price: 'Under',
}

function filterChip(key: string, value: string | number | boolean) {
  const label = FILTER_LABELS[key] ?? key
  const shown = key === 'max_price' ? `$${value}` : String(value)
  return `${label}: ${shown}`
}

// The chat -> page half of the contract: renders the agent's search matches
// (PageResults from POST /api/chat) as the same clickable product cards the
// catalogue uses, so each one still opens /products/:productId.
export default function ChatResults({ results }: { results: ChatPageResults }) {
  const { clearPageResults, setOpen } = useChat()
  const shown = results.products.length

  return (
    <section className="chat-results" aria-live="polite">
      <div className="chat-results-head">
        <div>
          <span className="eyebrow">🐾 From your chat with the Bulldog</span>
          <h1>{results.title}</h1>
          <p className="muted">
            {results.total_matches} {results.total_matches === 1 ? 'match' : 'matches'}
            {shown < results.total_matches ? ` · showing the top ${shown}` : ''}
            {results.query && <> · searched “{results.query}”</>}
          </p>
          {Object.keys(results.filters).length > 0 && (
            <div className="chips">
              {Object.entries(results.filters).map(([k, v]) => (
                <span key={k} className="chip chip-static">
                  {filterChip(k, v)}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="chat-results-actions">
          <button className="btn btn-outline btn-sm" onClick={() => setOpen(true)}>
            Refine in chat
          </button>
          <button className="btn btn-primary btn-sm" onClick={clearPageResults}>
            Show all products
          </button>
        </div>
      </div>

      {/* key=version restarts the entrance animation for every new chat search */}
      <div className="product-grid chat-results-grid" key={results.version}>
        {results.products.map((p, i) => (
          <ProductCard key={p.product_id} product={p} index={i} />
        ))}
      </div>
    </section>
  )
}
