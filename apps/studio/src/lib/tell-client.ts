import type { ToldClientInput } from '@seamless/shared'
import { firstName, formatDate } from './format'

export type Moment = ToldClientInput['moment']
export type Channel = ToldClientInput['channel']

export type TellClientContext = {
  atelierName: string
  clientName: string
  orderNumber: string
  dueDate: string
  trackingUrl: string
}

export const MOMENT_CHOICES: { value: Moment; label: string }[] = [
  { value: 'created', label: 'Order taken in' },
  { value: 'ready', label: 'Ready to collect' },
  { value: 'invoiced', label: 'Invoice sent' },
]

export function suggestedMoment(order: { status: string }, hasSentInvoice: boolean): Moment {
  if (hasSentInvoice) return 'invoiced'
  if (order.status === 'ready' || order.status === 'collected') return 'ready'
  return 'created'
}

export function clientMessage(moment: Moment, context: TellClientContext): string {
  const hello = `Hi ${firstName(context.clientName)}, it's ${context.atelierName}.`
  const link = `Follow it here: ${context.trackingUrl}`
  switch (moment) {
    case 'created':
      return `${hello} We've got your order ${context.orderNumber} and it's due ${formatDate(context.dueDate)}. ${link}`
    case 'ready':
      return `${hello} Good news: order ${context.orderNumber} is ready to collect. ${link}`
    case 'invoiced':
      return `${hello} Your invoice for order ${context.orderNumber} is ready, with every hour on it. ${link}`
  }
}

export function emailSubject(moment: Moment, context: TellClientContext): string {
  switch (moment) {
    case 'created':
      return `Your order ${context.orderNumber} with ${context.atelierName}`
    case 'ready':
      return `Order ${context.orderNumber} is ready to collect`
    case 'invoiced':
      return `Your invoice for order ${context.orderNumber}`
  }
}

export function whatsappNumber(phone: string): string {
  const trimmed = phone.trim()
  const digits = trimmed.replace(/\D/g, '')
  if (trimmed.startsWith('+')) return digits
  if (digits.startsWith('00')) return digits.slice(2)
  if (digits.startsWith('0')) return `44${digits.slice(1)}`
  return digits
}

export function whatsappUrl(phone: string | null, message: string): string {
  const number = phone ? whatsappNumber(phone) : ''
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}

export function mailtoUrl(email: string, subject: string, body: string): string {
  return `mailto:${email.trim()}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
