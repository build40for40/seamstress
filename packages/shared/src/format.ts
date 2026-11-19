const poundsFormatter = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })

export function formatPence(pence: number): string {
  return poundsFormatter.format(pence / 100)
}

export function formatMinutes(minutes: number): string {
  const sign = minutes < 0 ? '-' : ''
  const hours = Math.floor(Math.abs(minutes) / 60)
  const rest = Math.abs(minutes) % 60
  if (hours === 0) return `${sign}${rest}m`
  if (rest === 0) return `${sign}${hours}h`
  return `${sign}${hours}h ${rest}m`
}

export function poundsToPence(pounds: number): number {
  return Math.round(pounds * 100)
}
