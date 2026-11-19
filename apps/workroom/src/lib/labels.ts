import type { DueFlag, GarmentStatus } from '@seamstress/shared'
import { formatRelativeDay } from './dates'

export const STAGE_LABELS: Record<GarmentStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  fitting: 'Fitting',
  done: 'Done',
}

export const GARMENT_MOVES: Record<GarmentStatus, readonly GarmentStatus[]> = {
  todo: ['in_progress', 'fitting', 'done'],
  in_progress: ['fitting', 'done'],
  fitting: ['in_progress', 'done'],
  done: [],
}

export const FLAG_LABELS: Record<NonNullable<DueFlag>, string> = {
  overdue: 'Overdue',
  due_soon: 'Due soon',
}

export const dueText = (dueDate: string | null, today: string) =>
  dueDate ? `Due ${formatRelativeDay(dueDate, today)}` : 'No due date'

const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten']

export function countWords(count: number, one: string, many: string) {
  return `${WORDS[count] ?? count} ${count === 1 ? one : many}`
}

export const hoursFromMinutes = (minutes: number) => Math.round((minutes / 60) * 100) / 100
