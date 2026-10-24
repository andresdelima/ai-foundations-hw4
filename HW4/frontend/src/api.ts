// Typed client for the Campus Customs FastAPI backend.
// All calls are same-origin (/api, /media) and proxied by Vite to the backend,
// so no keys or backend URLs live in the browser bundle.

export type SizeStock = { size: string; quantity: number }

export type Product = {
  product_id: string
  name: string
  raw_name: string
  garment_type: string
  category: string
  collection: string
  description: string
  colors: string[]
  search_tags: string[]
  image_url: string
  price: number
  total_stock: number
  sizes?: SizeStock[]
}

export type ProductList = {
  count: number
  categories: string[]
  collections: string[]
  products: Product[]
}

/** The fields a product card needs; chat replies send only these. */
export type CardProduct = Pick<Product, 'product_id' | 'name' | 'category' | 'description' | 'image_url' | 'price' | 'total_stock'> & {
  in_stock_sizes?: string[]
}

export type ChatTurn = { role: 'user' | 'assistant'; content: string }

/** Chat -> page contract: search matches the agent wants shown on the website. */
export type PageResults = {
  title: string
  query: string
  filters: Record<string, string | number | boolean>
  total_matches: number
  products: CardProduct[]
}

/** What the shopper is looking at, sent with each chat message. */
export type PageContext = {
  path: string
  product_id?: string | null
  listing_title?: string | null
  visible_product_ids?: string[]
}

/** A saved message from chat_messages, reloaded for logged-in shoppers. */
export type HistoryMessage = {
  id: number
  role: 'user' | 'assistant'
  content: string
  created_at: string
  products: CardProduct[]
}

export type ChatReply = {
  reply: string
  products: CardProduct[]
  page_results: PageResults | null
  model: string
  tool_calls: string[]
  /** Server-side answer guardrail result. */
  check: { prices_checked: number; retries: number; passed: boolean } | null
}

export type User = {
  id: number
  email: string
  first_name: string
  last_name: string
  name: string
}

export type SignupInput = { first_name: string; last_name: string; email: string; password: string }

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    const detail = await res.json().catch(() => null)
    throw new Error(detail?.detail ?? `Request failed (${res.status})`)
  }
  return res.json() as Promise<T>
}

const postJson = <T,>(url: string, body: unknown = {}) =>
  getJson<T>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

// The session lives in an HttpOnly cookie set by the backend; the browser sends
// it automatically on these same-origin requests and page code never sees it.
export const api = {
  products: () => getJson<ProductList>('/api/products'),
  product: (id: string) => getJson<Product>(`/api/products/${encodeURIComponent(id)}`),
  chat: (message: string, history: ChatTurn[], page: PageContext) =>
    postJson<ChatReply>('/api/chat', { message, history, page }),
  chatHistory: () => getJson<HistoryMessage[]>('/api/chat/history'),
  clearChatHistory: () => getJson<{ deleted: number }>('/api/chat/history', { method: 'DELETE' }),
  me: () => getJson<{ user: User | null }>('/api/auth/me'),
  login: (email: string, password: string) => postJson<{ user: User }>('/api/auth/login', { email, password }),
  signup: (input: SignupInput) => postJson<{ user: User }>('/api/auth/signup', input),
  logout: () => postJson<{ ok: boolean }>('/api/auth/logout'),
}

export const formatPrice = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

export const shortText = (s: string, max = 90) =>
  s.length <= max ? s : s.slice(0, s.lastIndexOf(' ', max)).replace(/[,;.]$/, '') + '…'
