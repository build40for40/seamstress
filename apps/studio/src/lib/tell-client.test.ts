import { describe, expect, it } from 'vitest'
import { clientMessage, mailtoUrl, suggestedMoment, whatsappNumber, whatsappUrl } from './tell-client'

const context = {
  atelierName: 'Needle & Thread Atelier',
  clientName: 'Clara Example',
  orderNumber: 'SE-1003',
  dueDate: '2026-11-28',
  trackingUrl: 'https://seamstress.build40for40.com/track/abc',
}

describe('tell the client', () => {
  it('picks the news from where the order is', () => {
    expect(suggestedMoment({ status: 'open' }, false)).toBe('created')
    expect(suggestedMoment({ status: 'ready' }, false)).toBe('ready')
    expect(suggestedMoment({ status: 'ready' }, true)).toBe('invoiced')
  })

  it('writes a message with the order number and the link', () => {
    const message = clientMessage('ready', context)
    expect(message).toContain('Hi Clara')
    expect(message).toContain('SE-1003 is ready to collect')
    expect(message).toContain(context.trackingUrl)
  })

  it('turns UK and international numbers into WhatsApp ones', () => {
    expect(whatsappNumber('020 0000 0000')).toBe('442000000000')
    expect(whatsappNumber('+33 6 12 34 56 78')).toBe('33612345678')
    expect(whatsappNumber('0033 6 12 34 56 78')).toBe('33612345678')
  })

  it('builds WhatsApp and email links with the message filled in', () => {
    expect(whatsappUrl('020 0000 0000', 'Hi & bye')).toBe('https://wa.me/442000000000?text=Hi%20%26%20bye')
    expect(whatsappUrl(null, 'Hi')).toBe('https://wa.me/?text=Hi')
    expect(mailtoUrl('clara@example.com', 'Ready', 'Come by')).toBe('mailto:clara@example.com?subject=Ready&body=Come%20by')
  })
})
