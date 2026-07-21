import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'

export function useApiResource<T>(path: string) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshIndex, setRefreshIndex] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    apiFetch(path)
      .then((json) => {
        if (!cancelled) setData(json)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [path, refreshIndex])

  const refetch = useCallback(() => setRefreshIndex((n) => n + 1), [])

  return { data, loading, error, refetch }
}
