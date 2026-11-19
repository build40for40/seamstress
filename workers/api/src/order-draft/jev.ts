import { z } from 'zod'

export const JEV_MODEL = 'jev-1.14.0'
const TYPESAFE_URL = 'https://api.typesafe.ai/v1/systemone'

export type NoulQuestion = { type: 'noul'; instructions: string; criteria?: { true: string; false: string } }
export type ChoiceQuestion = { type: 'choice'; instructions: string; criteria: Record<string, string | null> }
export type JevQuestion = NoulQuestion | ChoiceQuestion

export type JevRequest = { model: string; state: Record<string, unknown>; questions: Record<string, JevQuestion> }

const answerSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('noul'), noul: z.number().min(0).max(1) }),
  z.object({
    type: z.literal('choice'),
    choice: z.string(),
    confidence: z.number(),
    probabilities: z.record(z.string(), z.number()),
  }),
])

const responseSchema = z.object({ model: z.string(), answers: z.record(z.string(), answerSchema) })

export type JevAnswer = z.infer<typeof answerSchema>

export async function askJev(apiKey: string, request: JevRequest, fetcher: typeof fetch = fetch) {
  const response = await fetcher(TYPESAFE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`TypeSafe said ${response.status}: ${body.slice(0, 300)}`)
  }
  const { answers } = responseSchema.parse(await response.json())
  for (const [id, question] of Object.entries(request.questions)) {
    const answer = answers[id]
    if (answer?.type !== question.type) throw new Error(`TypeSafe gave no ${question.type} answer for ${id}`)
    if (question.type === 'choice' && answer.type === 'choice' && !(answer.choice in question.criteria)) {
      throw new Error(`TypeSafe picked ${answer.choice}, which isn't an option for ${id}`)
    }
  }
  return answers
}
