import { beforeEach, describe, expect, it } from 'vitest'
import { clearMemberKey, setMemberKey } from './composables/useMemberKey'
import { router } from './router'

describe('workroom router', () => {
  beforeEach(clearMemberKey)

  it('sends anyone without a key to the no-key screen', async () => {
    await router.push('/timesheet')
    expect(router.currentRoute.value.name).toBe('no-key')
  })

  it('lets a member with a key in', async () => {
    setMemberKey('fake-key')
    await router.push('/timesheet')
    expect(router.currentRoute.value.name).toBe('timesheet')
  })
})
