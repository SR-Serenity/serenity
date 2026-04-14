export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:2991'

export async function request<T>(
  path: string,
  init?: RequestInit & { token?: string }
): Promise<T> {
  const { token, ...rest } = init ?? {}

  const headers: Record<string, string> = {
    'content-type': 'application/json',
    ...(rest.headers as Record<string, string> ?? {}),
  }

  if (token) {
    headers['authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}/api/${path}`, {
    ...rest,
    headers,
  })

  const text = await response.text()
  const payload = text ? JSON.parse(text) : {}

  if (!response.ok) {
    const message =
      payload.message ??
      payload.error ??
      `Request failed with status ${response.status}`
    throw new Error(Array.isArray(message) ? message.join(', ') : message)
  }

  return payload as T
}
