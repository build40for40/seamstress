import type { JevAnswer, JevQuestion, JevRequest } from './jev'
import { JEV_MODEL } from './jev'

export const YES = 0.7
export const NO = 0.3

export type Verdict = 'yes' | 'no' | 'unsure'

export const verdictOf = (probability: number): Verdict => (probability > YES ? 'yes' : probability < NO ? 'no' : 'unsure')

export type Named = { id: string; name: string }

export type Pick = { fits: number; id: string; probability: number }

export type Judgments = {
  client: Pick | null
  people: Map<string, Pick>
  priceItems: Map<string, number>
  express: number
}

type Options = { criteria: Record<string, null>; idOf: Map<string, string> }

function options(named: Named[]): Options {
  const criteria: Record<string, null> = {}
  const idOf = new Map<string, string>()
  for (const { id, name } of named) {
    let option = name
    for (let copy = 2; option in criteria; copy++) option = `${name} (${copy})`
    criteria[option] = null
    idOf.set(option, id)
  }
  return { criteria, idOf }
}

const quote = (text: string) => JSON.stringify(text)

export type QuestionsInput = {
  note: string
  candidates: Named[]
  people: string[]
  members: Named[]
  priceItems: Named[]
}

export function draftQuestions({ note, candidates, people, members, priceItems }: QuestionsInput) {
  const state: Record<string, unknown> = { note }
  const questions: Record<string, JevQuestion> = {}
  const choices = new Map<string, Options>()

  if (candidates.length > 0) {
    state.client_candidates = candidates.map((client) => client.name)
    questions.client_fits = {
      type: 'noul',
      instructions: 'Is the client in `note` one of the people named in `client_candidates`?',
      criteria: {
        true: 'The name the note gives for the client is the full name, first name, short form, or title and surname of someone in `client_candidates`.',
        false: 'The note gives the client a different name from everyone in `client_candidates`.',
      },
    }
    const clientOptions = options(candidates)
    choices.set('client_pick', clientOptions)
    questions.client_pick = {
      type: 'choice',
      instructions: 'Which person in `client_candidates` is the client in `note`?',
      criteria: clientOptions.criteria,
    }
  }

  if (people.length > 0) {
    state.team_members = members.map((member) => member.name)
    const memberOptions = options(members)
    people.forEach((person, index) => {
      questions[`person_${index}_fits`] = {
        type: 'noul',
        instructions: `In \`note\`, is ${quote(person)} one of the people in \`team_members\`?`,
        criteria: {
          true: `${quote(person)} is the name, a short form or a nickname of someone in \`team_members\`.`,
          false: `${quote(person)} doesn't match anyone in \`team_members\`.`,
        },
      }
      choices.set(`person_${index}_pick`, memberOptions)
      questions[`person_${index}_pick`] = {
        type: 'choice',
        instructions: `Who in \`team_members\` does \`note\` mean by ${quote(person)}?`,
        criteria: memberOptions.criteria,
      }
    })
  }

  priceItems.forEach((item, index) => {
    questions[`price_item_${index}`] = {
      type: 'noul',
      instructions: `Does \`note\` ask for ${quote(item.name)} on any garment?`,
      criteria: {
        true: `The note asks for ${quote(item.name)} on a garment, in these words or others that mean the same job.`,
        false: `None of the work in the note is ${quote(item.name)}.`,
      },
    }
  })

  questions.express = {
    type: 'noul',
    instructions: 'Does `note` ask for this order to be rushed?',
    criteria: {
      true: 'The note says the client needs the work urgently, as soon as possible, or as a rush or express job.',
      false: 'The note gives a date or no date, and doesn\'t ask for the work to be hurried.',
    },
  }

  const request: JevRequest = { model: JEV_MODEL, state, questions }

  function read(answers: Record<string, JevAnswer>): Judgments {
    const noul = (id: string) => {
      const answer = answers[id]
      if (answer?.type !== 'noul') throw new Error(`No noul answer for ${id}`)
      return answer.noul
    }
    const pick = (fitsId: string, pickId: string): Pick => {
      const answer = answers[pickId]
      if (answer?.type !== 'choice') throw new Error(`No choice answer for ${pickId}`)
      return {
        fits: noul(fitsId),
        id: choices.get(pickId)!.idOf.get(answer.choice)!,
        probability: answer.probabilities[answer.choice] ?? 0,
      }
    }
    return {
      client: candidates.length > 0 ? pick('client_fits', 'client_pick') : null,
      people: new Map(people.map((person, index) => [person, pick(`person_${index}_fits`, `person_${index}_pick`)])),
      priceItems: new Map(priceItems.map((item, index) => [item.id, noul(`price_item_${index}`)])),
      express: noul('express'),
    }
  }

  return { request, read }
}
