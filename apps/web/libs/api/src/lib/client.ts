import axios, { type AxiosRequestConfig } from 'axios'

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:2991'

const client = axios.create({
    baseURL: `${API_BASE}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000,
})

type ApiOptions = {
    token?: string
    body?: unknown
}

async function send<T>(
    method: AxiosRequestConfig['method'],
    path: string,
    options?: ApiOptions
): Promise<T> {
    const { token, body } = options ?? {}

    const config: AxiosRequestConfig = {
        method,
        data: body,
    }

    if (token) {
        config.headers = { Authorization: `Bearer ${token}` }
    }

    try {
        const response = await client.request({
            url: path,
            ...config,
        })
        return response.data as T
    } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
            if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
                throw new Error('Request timed out. Please try again.')
            }
            if (!error.response) {
                throw new Error('Cannot connect to server. Please ensure services are running.')
            }
            const message =
                error.response?.data?.message ??
                error.response?.data?.error ??
                error.message
            throw new Error(Array.isArray(message) ? message.join(', ') : message)
        }
        throw error
    }
}

export const api = {
    get: <T>(path: string, options?: Omit<ApiOptions, 'body'>) =>
        send<T>('GET', path, options),
    post: <T>(path: string, options?: ApiOptions) =>
        send<T>('POST', path, options),
    patch: <T>(path: string, options?: ApiOptions) =>
        send<T>('PATCH', path, options),
    delete: <T>(path: string, options?: ApiOptions) =>
        send<T>('DELETE', path, options),
}

export { client }
