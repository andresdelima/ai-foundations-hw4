import { useEffect, useState } from 'react'
import { api, type ProductList } from './api'

// Loads the catalogue once per page that needs it.
export function useProducts() {
  const [data, setData] = useState<ProductList | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    api
      .products()
      .then((d) => alive && setData(d))
      .catch((e: Error) => alive && setError(e.message))
    return () => {
      alive = false
    }
  }, [])

  return { data, error, loading: !data && !error }
}
