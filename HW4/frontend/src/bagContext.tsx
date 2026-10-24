import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

// Shopping bag, saved on this device (localStorage) so it survives reloads.
// Quantities are capped by live stock: `max` is refreshed from the database
// every time the drawer opens (BagDrawer) and when an item is added.

export type BagItem = {
  product_id: string
  name: string
  image_url: string
  price: number
  size: string
  qty: number
  /** Units on hand in this size at the last check. */
  max: number
}

type AddResult = { ok: boolean; message: string }

type BagState = {
  items: BagItem[]
  count: number
  subtotal: number
  open: boolean
  setOpen: (open: boolean) => void
  add: (item: Omit<BagItem, 'qty'>, qty?: number) => AddResult
  setQty: (product_id: string, size: string, qty: number) => void
  remove: (product_id: string, size: string) => void
  refreshStock: (updates: { product_id: string; size: string; max: number; price: number }[]) => void
  clear: () => void
}

const STORAGE_KEY = 'cc_bag_v1'
const BagContext = createContext<BagState | null>(null)

function load(): BagItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

export function BagProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<BagItem[]>(load)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const same = (a: { product_id: string; size: string }, b: { product_id: string; size: string }) =>
    a.product_id === b.product_id && a.size === b.size

  const add = useCallback(
    (item: Omit<BagItem, 'qty'>, qty = 1): AddResult => {
      const existing = items.find((i) => same(i, item))
      const current = existing?.qty ?? 0
      const allowed = Math.min(qty, item.max - current)
      if (item.max <= 0) return { ok: false, message: `Size ${item.size} is sold out.` }
      if (allowed <= 0) return { ok: false, message: `You already have all ${item.max} in size ${item.size} in your bag.` }
      setItems((prev) =>
        existing
          ? prev.map((i) => (same(i, item) ? { ...i, qty: i.qty + allowed, max: item.max, price: item.price } : i))
          : [...prev, { ...item, qty: allowed }],
      )
      return { ok: true, message: `Added ${item.name} (${item.size}) to your bag.` }
    },
    [items],
  )

  const setQty = useCallback((product_id: string, size: string, qty: number) => {
    setItems((prev) =>
      prev.map((i) => (same(i, { product_id, size }) ? { ...i, qty: Math.max(1, Math.min(qty, i.max)) } : i)),
    )
  }, [])

  const remove = useCallback((product_id: string, size: string) => {
    setItems((prev) => prev.filter((i) => !same(i, { product_id, size })))
  }, [])

  const refreshStock = useCallback(
    (updates: { product_id: string; size: string; max: number; price: number }[]) => {
      setItems((prev) =>
        prev.map((i) => {
          const u = updates.find((x) => same(x, i))
          return u ? { ...i, max: u.max, price: u.price, qty: Math.min(i.qty, Math.max(u.max, 0)) } : i
        }),
      )
    },
    [],
  )

  const clear = useCallback(() => setItems([]), [])

  const value = useMemo(
    () => ({
      items,
      count: items.reduce((n, i) => n + i.qty, 0),
      subtotal: items.reduce((n, i) => n + i.qty * i.price, 0),
      open,
      setOpen,
      add,
      setQty,
      remove,
      refreshStock,
      clear,
    }),
    [items, open, add, setQty, remove, refreshStock, clear],
  )

  return <BagContext.Provider value={value}>{children}</BagContext.Provider>
}

export function useBag() {
  const ctx = useContext(BagContext)
  if (!ctx) throw new Error('useBag must be used inside <BagProvider>')
  return ctx
}
