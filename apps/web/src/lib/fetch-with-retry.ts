/**
 * Fetch wrapper with retry, timeout, and error handling
 */

interface FetchOptions extends RequestInit {
  retries?: number
  retryDelay?: number
  timeout?: number
}

export class ApiError extends Error {
  status: number
  code: string

  constructor(message: string, status: number, code: string = 'API_ERROR') {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export async function fetchWithRetry<T>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const {
    retries = 2,
    retryDelay = 1000,
    timeout = 10000,
    ...fetchOptions
  } = options

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...fetchOptions.headers,
        },
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        if (response.status === 429) {
          throw new ApiError('Rate limit exceeded', 429, 'RATE_LIMITED')
        }
        if (response.status === 401) {
          throw new ApiError('Unauthorized', 401, 'UNAUTHORIZED')
        }
        if (response.status >= 500 && attempt < retries) {
          await new Promise((r) => setTimeout(r, retryDelay * (attempt + 1)))
          continue
        }
        const body = await response.json().catch(() => ({}))
        throw new ApiError(body.error || response.statusText, response.status)
      }

      return await response.json()
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof ApiError) throw error

      if (error instanceof DOMException && error.name === 'AbortError') {
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, retryDelay))
          continue
        }
        throw new ApiError('Request timeout', 408, 'TIMEOUT')
      }

      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, retryDelay * (attempt + 1)))
        continue
      }

      throw new ApiError(
        error instanceof Error ? error.message : 'Network error',
        0,
        'NETWORK_ERROR'
      )
    }
  }

  throw new ApiError('Max retries exceeded', 0, 'MAX_RETRIES')
}
