import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import apiClient from '../api/client'

interface AuthContextType {
  isAuthenticated: boolean
  username: string | null
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const TOKEN_KEY = 'auth_token'
const USERNAME_KEY = 'auth_username'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [username, setUsername] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Check for existing token on mount
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    const storedUsername = localStorage.getItem(USERNAME_KEY)
    
    if (token && storedUsername) {
      // Verify token is still valid
      apiClient.get('/api/auth/verify', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(() => {
          setIsAuthenticated(true)
          setUsername(storedUsername)
          // Set token in API client
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`
        })
        .catch((error) => {
          // Token invalid, clear storage
          console.log('Token verification failed:', error)
          localStorage.removeItem(TOKEN_KEY)
          localStorage.removeItem(USERNAME_KEY)
          delete apiClient.defaults.headers.common['Authorization']
          setIsAuthenticated(false)
          setUsername(null)
        })
        .finally(() => {
          setLoading(false)
        })
    } else {
      // No token found, ensure we're not authenticated
      setIsAuthenticated(false)
      setUsername(null)
      setLoading(false)
    }
  }, [])

  const login = async (username: string, password: string) => {
    try {
      const response = await apiClient.post('/api/auth/login', {
        username,
        password,
      })
      
      const { access_token, username: user } = response.data
      
      // Store token and username
      localStorage.setItem(TOKEN_KEY, access_token)
      localStorage.setItem(USERNAME_KEY, user)
      
      // Set token in API client
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
      
      setIsAuthenticated(true)
      setUsername(user)
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Login failed')
    }
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USERNAME_KEY)
    delete apiClient.defaults.headers.common['Authorization']
    setIsAuthenticated(false)
    setUsername(null)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, username, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

