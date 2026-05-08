import axios from 'axios'

export const api = axios.create({
  baseURL: '/api',
  withCredentials: false,
})

const TOKEN_KEY = 'zynsource_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      setToken(null)
    }
    return Promise.reject(err)
  },
)

export function apiError(err: unknown, fallback = 'Something went wrong') {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.error || err.message || fallback
  }
  return fallback
}
