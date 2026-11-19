export async function getAccessToken(): Promise<string | null> {
  return null
}

export function useAuth() {
  return { getAccessToken }
}
