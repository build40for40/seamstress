const STORAGE_KEY = 'seamstress.memberKey'

export const MEMBER_KEY_HEADER = 'X-Member-Key'

export function memberKey(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function setMemberKey(key: string) {
  try {
    localStorage.setItem(STORAGE_KEY, key)
  } catch {}
}

export function clearMemberKey() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {}
}

export function useMemberKey() {
  return { memberKey, setMemberKey, clearMemberKey }
}
