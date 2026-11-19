import type { MemberRow, TeamRow } from './db/rows'

export type AppEnv = {
  Bindings: Env
  Variables: {
    userId: string
    member: MemberRow
    team: TeamRow
    via: 'token' | 'key'
  }
}
