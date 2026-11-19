import { withMemberKey } from './useApi'

const sources = new Map<string, Promise<string>>()

export function photoSrc(url: string): Promise<string> {
  let source = sources.get(url)
  if (!source) {
    source = fetch(url, { headers: withMemberKey() }).then(async (response) => {
      if (!response.ok) throw new Error(`Photo ${response.status}`)
      return URL.createObjectURL(await response.blob())
    })
    source.catch(() => sources.delete(url))
    sources.set(url, source)
  }
  return source
}

export function primePhoto(url: string, blob: Blob) {
  sources.set(url, Promise.resolve(URL.createObjectURL(blob)))
}
