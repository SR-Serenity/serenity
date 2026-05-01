import axios, { type AxiosRequestConfig } from 'axios'

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:2991'

const client = axios.create({
    baseURL: `${API_BASE}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000,
})

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

export async function request<T>(
    path: string,
    init?: RequestInit & { token?: string }
): Promise<T> {
    const { token, method = 'POST', body } = init ?? {}

    const config: AxiosRequestConfig = {
        method: (method?.toUpperCase() ?? 'POST') as HttpMethod,
    }

    if (body) {
        config.data = typeof body === 'string' ? JSON.parse(body) : body
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

export { client }