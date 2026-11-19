import { z } from 'zod'

export const ANTHROPIC_MODEL = 'claude-haiku-5-5'
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2026-10-21'
const TOOL_NAME = 'record_order'

export const UNCLEAR_PARTS = ['client', 'description', 'garments', 'people', 'quote', 'due_date'] as const

export const noteReadingSchema = z.object({
  client: z.object({
    name: z.string().nullable(),
    phone: z.string().nullable(),
    email: z.string().nullable(),
  }),
  description: z.string().nullable(),
  garments: z.array(z.object({ description: z.string(), people: z.array(z.string()) })),
  quote_pounds: z.number().nullable(),
  due_date: z.string().nullable(),
  due_date_words: z.string().nullable(),
  due_date_exact: z.boolean(),
  unclear: z.array(z.enum(UNCLEAR_PARTS)),
})

export type NoteReading = z.infer<typeof noteReadingSchema>

const text = (description: string) => ({ type: ['string', 'null'], description })

const recordOrderTool = {
  name: TOOL_NAME,
  description: 'Record what the note says about the order. Leave a field null or empty when the note does not say it.',
  strict: true,
  input_schema: {
    type: 'object',
    additionalProperties: false,
    required: ['client', 'description', 'garments', 'quote_pounds', 'due_date', 'due_date_words', 'due_date_exact', 'unclear'],
    properties: {
      client: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'phone', 'email'],
        properties: {
          name: text('The client\'s name exactly as the note gives it, with any title, such as "Mrs Fake". Null when the note names no client.'),
          phone: text('The client\'s phone number exactly as written in the note. Null when the note has none.'),
          email: text('The client\'s email address exactly as written in the note. Null when the note has none.'),
        },
      },
      description: text('One short line summing up the whole order, such as "Wedding gown alterations and a bolero". Null when the note is not about an order.'),
      garments: {
        type: 'array',
        description: 'One entry per garment or item the client brought in. Empty when the note is not about an order.',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['description', 'people'],
          properties: {
            description: {
              type: 'string',
              description: 'What the garment is and what needs doing, in a few words and in the note\'s own terms, such as "Wedding gown: take in the bodice, hem". Several jobs on one garment stay in one entry.',
            },
            people: {
              type: 'array',
              items: { type: 'string' },
              description: 'Names of the people the note gives this garment to, exactly as written, such as "Bea". "me" when the writer says they will do it themselves. Empty when the note names nobody for it.',
            },
          },
        },
      },
      quote_pounds: {
        type: ['number', 'null'],
        description: 'The price the note says was quoted or agreed for the whole order, in pounds: "quoted 480" is 480. Null when the note gives no total, even if it prices separate jobs.',
      },
      due_date: {
        type: ['string', 'null'],
        format: 'date',
        description: 'When the client needs the order, as YYYY-MM-DD, worked out from today\'s date. "The 12th" is the next 12th on or after today. Null when the note gives no date, including "ASAP" or "no rush".',
      },
      due_date_words: text('The words the note uses for when the order is needed, copied exactly, such as "by the 12th" or "ASAP". Null when the note says nothing about timing.'),
      due_date_exact: {
        type: 'boolean',
        description: 'True only when the note names both the day and the month, such as "12 December" or "12/12". False when you worked the date out from today, as with "the 12th", "Friday" or "in two weeks", and false when there is no date.',
      },
      unclear: {
        type: 'array',
        items: { type: 'string', enum: [...UNCLEAR_PARTS] },
        description: 'The parts where the note is ambiguous or you had to choose between readings, such as two different prices or an item that could be one garment or two. "people" is the people named for garments, "quote" the price. Empty when everything you recorded is clear.',
      },
    },
  },
}

const SYSTEM_PROMPT = `You read notes that the owner of a sewing atelier types or dictates when a client brings in work, and you record what each note says about the order with the ${TOOL_NAME} tool.

Record only what the note says. Never invent or guess a client, phone number, email, date, price or person: when the note doesn't say something, leave it null or empty, and the owner will fill it in. If the note isn't about an order at all, record no garments.`

const longDate = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

export function noteRequest(note: string, today: string) {
  const todayText = longDate.format(new Date(`${today}T12:00:00Z`))
  return {
    model: ANTHROPIC_MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    tools: [recordOrderTool],
    tool_choice: { type: 'tool', name: TOOL_NAME },
    messages: [
      {
        role: 'user',
        content: `Today is ${todayText} (${today}) in London.\n\n<note>\n${note}\n</note>`,
      },
    ],
  }
}

const messageSchema = z.object({
  stop_reason: z.string().nullable(),
  content: z.array(z.looseObject({ type: z.string(), name: z.string().optional(), input: z.unknown().optional() })),
})

export async function readNote(apiKey: string, note: string, today: string, fetcher: typeof fetch = fetch): Promise<NoteReading> {
  const response = await fetcher(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify(noteRequest(note, today)),
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Anthropic said ${response.status}: ${body.slice(0, 300)}`)
  }
  const message = messageSchema.parse(await response.json())
  if (message.stop_reason === 'refusal') throw new Error('Anthropic declined the note')
  const call = message.content.find((block) => block.type === 'tool_use' && block.name === TOOL_NAME)
  if (!call) throw new Error(`Anthropic gave no ${TOOL_NAME} call (stop reason ${message.stop_reason})`)
  const reading = noteReadingSchema.safeParse(call.input)
  if (!reading.success) throw new Error(`Anthropic gave an invalid ${TOOL_NAME} call: ${reading.error.issues[0]?.message}`)
  return reading.data
}
