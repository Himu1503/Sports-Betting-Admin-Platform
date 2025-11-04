import axios from 'axios'

// Use environment variable if set, otherwise use relative path for production
// or localhost for development
const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL
  if (envUrl) {
    return envUrl
  }
  
  // If running in browser and on same domain, use relative path
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return '/api'
  }
  
  // Default to localhost for local development
  return 'http://localhost:8000'
}

const API_BASE_URL = getApiBaseUrl()

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle 401 errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth data
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_username')
      delete apiClient.defaults.headers.common['Authorization']
      
      // Redirect to login if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default apiClient

