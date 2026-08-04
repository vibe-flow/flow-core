import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

type UrlStateValue = string | number | boolean | string[]

function encode(value: UrlStateValue): string | null {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(',') : null
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string') return value || null
  return null
}

function decode<T extends UrlStateValue>(raw: string | null, defaultValue: T): T {
  if (raw === null) return defaultValue

  if (Array.isArray(defaultValue)) {
    return (raw ? raw.split(',') : []) as T
  }
  if (typeof defaultValue === 'boolean') {
    return (raw === 'true') as T
  }
  if (typeof defaultValue === 'number') {
    const n = Number(raw)
    return (isNaN(n) ? defaultValue : n) as T
  }
  return raw as T
}

/**
 * State persisted in URL search params. Shareable by link.
 *
 * ⚠️ Un seul paramètre à la fois. Deux `setValue` dans le même gestionnaire
 * (« pose ce filtre, et reviens en page 1 ») se marchent dessus : `navigate`
 * étant différé, l'updater du second reçoit encore l'URL d'avant le premier,
 * et seule la dernière écriture survit — le filtre disparaît aussitôt posé,
 * sans erreur nulle part. Pour changer plusieurs paramètres d'un coup, passer
 * par `useSearchParams` et construire une seule `URLSearchParams`.
 *
 * @param key - URL param name (e.g. 'q', 'page', 'status')
 * @param defaultValue - Default when param is absent
 * @returns [value, setValue] — same API as useState
 *
 * @example
 * const [search, setSearch] = useUrlState('q', '')
 * const [page, setPage] = useUrlState('page', 1)
 * const [tags, setTags] = useUrlState('tags', [] as string[])
 */
export function useUrlState<T extends UrlStateValue>(
  key: string,
  defaultValue: T,
): [T, (value: T) => void] {
  const [searchParams, setSearchParams] = useSearchParams()

  const raw = searchParams.get(key)
  const value = decode(raw, defaultValue)

  const setValue = useCallback(
    (newValue: T) => {
      setSearchParams(
        (prev) => {
          const encoded = encode(newValue)
          const next = new URLSearchParams(prev)
          if (encoded === null || encoded === encode(defaultValue)) {
            next.delete(key)
          } else {
            next.set(key, encoded)
          }
          return next
        },
        { replace: true },
      )
    },
    [key, defaultValue, setSearchParams],
  )

  return [value, setValue]
}
