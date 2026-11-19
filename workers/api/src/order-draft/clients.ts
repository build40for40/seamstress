export const MAX_CANDIDATES = 5
const NAME_MATCH = 0.5
const MIN_PHONE_DIGITS = 7

export type KnownClient = { id: string; name: string; phone: string | null }

const TITLES = new Set(['mr', 'mrs', 'ms', 'miss', 'mx', 'dr', 'prof', 'sir', 'lady', 'madam', 'madame'])

export function normalisePhone(phone: string): string | null {
  let digits = phone.replace(/\D/g, '')
  if (phone.trim().startsWith('+')) digits = `00${digits}`
  if (digits.startsWith('0044')) digits = `0${digits.slice(4)}`
  return digits.length >= MIN_PHONE_DIGITS ? digits : null
}

const words = (name: string) =>
  name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((word) => word && !TITLES.has(word))

const bigrams = (word: string) => Array.from({ length: Math.max(word.length - 1, 0) }, (_, i) => word.slice(i, i + 2))

function wordSimilarity(a: string, b: string) {
  if (a === b) return 1
  const [short, long] = a.length <= b.length ? [a, b] : [b, a]
  if (short.length >= 3 && long.startsWith(short)) return 0.9
  const left = bigrams(a)
  const right = bigrams(b)
  if (left.length === 0 || right.length === 0) return 0
  const pool = [...right]
  let shared = 0
  for (const pair of left) {
    const at = pool.indexOf(pair)
    if (at >= 0) {
      shared++
      pool.splice(at, 1)
    }
  }
  const dice = (2 * shared) / (left.length + right.length)
  return dice >= 0.6 ? dice : 0
}

export function nameSimilarity(mentioned: string, known: string) {
  const said = words(mentioned)
  const theirs = words(known)
  if (said.length === 0 || theirs.length === 0) return 0
  const total = said.reduce((sum, word) => sum + Math.max(...theirs.map((other) => wordSimilarity(word, other))), 0)
  return total / said.length
}

export function findCandidates(clients: KnownClient[], mentioned: { name: string | null; phone: string | null }) {
  const phone = mentioned.phone ? normalisePhone(mentioned.phone) : null
  const byPhone = phone ? clients.filter((client) => client.phone && normalisePhone(client.phone) === phone) : []
  if (byPhone.length > 0) return { byPhone: true, candidates: byPhone.slice(0, MAX_CANDIDATES) }

  const name = mentioned.name
  if (!name) return { byPhone: false, candidates: [] }
  const candidates = clients
    .map((client) => ({ client, score: nameSimilarity(name, client.name) }))
    .filter(({ score }) => score >= NAME_MATCH)
    .sort((a, b) => b.score - a.score || a.client.name.localeCompare(b.client.name))
    .slice(0, MAX_CANDIDATES)
    .map(({ client }) => client)
  return { byPhone: false, candidates }
}

const EMAIL_PATTERN = /[^\s@<>()]+@[^\s@<>()]+\.[^\s@<>()]+/g
const PHONE_PATTERN = /\+?\d[\d\s().-]{5,}\d/g

export function withoutContactDetails(note: string, ...extracted: (string | null)[]) {
  let redacted = note
  for (const value of extracted) if (value?.trim()) redacted = redacted.replaceAll(value.trim(), '[contact detail]')
  return redacted
    .replace(EMAIL_PATTERN, '[email]')
    .replace(PHONE_PATTERN, (match) => (match.replace(/\D/g, '').length >= 9 ? '[phone]' : match))
}
