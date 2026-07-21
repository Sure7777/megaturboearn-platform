import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { toast } from '@blinkdotnew/ui'
import { useNavigate } from '@tanstack/react-router'

interface AdminUser { email: string; role: string }

interface AdminAuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  user: AdminUser | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  isAuthenticated: false, isLoading: true, user: null,
  login: async () => false, logout: () => {},
})

const STORAGE_KEY = 'megaturbo_admin_auth'
const VALID_EMAIL = 'admin@megaturbo.com'
const VALID_PASSWORD = 'admin123'

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check stored auth on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed?.email && parsed?.role) {
          setUser(parsed)
        }
      }
    } catch {}
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    if (email === VALID_EMAIL && password === VALID_PASSWORD) {
      const adminUser: AdminUser = { email, role: 'super_admin' }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(adminUser))
      setUser(adminUser)
      toast.success('تم تسجيل الدخول بنجاح')
      return true
    }
    toast.error('البريد الإلكتروني أو كلمة المرور غير صحيحة')
    return false
  }

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
    toast.success('تم تسجيل الخروج')
  }

  return (
    <AdminAuthContext.Provider value={{ isAuthenticated: !!user, isLoading, user, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  return useContext(AdminAuthContext)
}
