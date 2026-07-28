import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { toast } from '@blinkdotnew/ui'

export interface AdminUser { email: string; role: string }

export interface SubAdmin {
  id: string
  name: string
  email: string
  role: 'finance' | 'ads' | 'moderator' | 'custom'
  permissions: {
    canManageUsers: boolean
    canManageAds: boolean
    canManageTasks: boolean
    canManageWithdrawals: boolean
    canManageSettings: boolean
  }
  created_at: string
}

interface AdminAuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  user: AdminUser | null
  subAdmins: SubAdmin[]
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  updateCredentials: (email: string, password: string) => void
  addSubAdmin: (admin: Omit<SubAdmin, 'id' | 'created_at'>) => void
  removeSubAdmin: (id: string) => void
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  isAuthenticated: false, isLoading: true, user: null, subAdmins: [],
  login: async () => false, logout: () => {},
  updateCredentials: () => {},
  addSubAdmin: () => {},
  removeSubAdmin: () => {},
})

const STORAGE_KEY = 'megaturbo_admin_auth'
const CREDENTIALS_KEY = 'megaturbo_admin_credentials'
const SUBADMINS_KEY = 'megaturbo_sub_admins'

const DEFAULT_CREDENTIALS = {
  email: 'admin@megaturbo.com',
  password: 'admin123'
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [subAdmins, setSubAdmins] = useState<SubAdmin[]>([])

  // Load credentials & subadmins
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const storedAuth = localStorage.getItem(STORAGE_KEY)
        if (storedAuth) {
          const parsed = JSON.parse(storedAuth)
          if (parsed?.email && parsed?.role) {
            setUser(parsed)
          }
        }

        const storedSubAdmins = localStorage.getItem(SUBADMINS_KEY)
        if (storedSubAdmins) {
          setSubAdmins(JSON.parse(storedSubAdmins))
        } else {
          const defaultSubAdmins: SubAdmin[] = [
            {
              id: 'sub-1',
              name: 'مشرف المالية',
              email: 'finance@megaturbo.com',
              role: 'finance',
              permissions: {
                canManageUsers: false,
                canManageAds: false,
                canManageTasks: false,
                canManageWithdrawals: true,
                canManageSettings: false,
              },
              created_at: new Date().toISOString()
            }
          ]
          setSubAdmins(defaultSubAdmins)
          localStorage.setItem(SUBADMINS_KEY, JSON.stringify(defaultSubAdmins))
        }
      }
    } catch {}
    setIsLoading(false)
  }, [])

  const getCredentials = () => {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(CREDENTIALS_KEY)
        if (stored) return JSON.parse(stored)
      }
    } catch {}
    return DEFAULT_CREDENTIALS
  }

  const login = async (email: string, password: string): Promise<boolean> => {
    const creds = getCredentials()
    if (email === creds.email && password === creds.password) {
      const adminUser: AdminUser = { email, role: 'super_admin' }
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(adminUser))
      }
      setUser(adminUser)
      toast.success('تم تسجيل الدخول بنجاح كمسؤول رئيسي')
      return true
    }

    // Check sub-admins
    const subMatch = subAdmins.find(s => s.email === email)
    if (subMatch && password === 'admin123') {
      const adminUser: AdminUser = { email, role: subMatch.role }
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(adminUser))
      }
      setUser(adminUser)
      toast.success(`تم تسجيل الدخول بنجاح كـ (${subMatch.name})`)
      return true
    }

    toast.error('البريد الإلكتروني أو كلمة المرور غير صحيحة')
    return false
  }

  const updateCredentials = (email: string, password: string) => {
    const newCreds = { email, password }
    if (typeof window !== 'undefined') {
      localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(newCreds))
    }
    if (user) {
      setUser({ ...user, email })
    }
    toast.success('تم تحديث بيانات تسجيل الدخول للمسؤول الرئيسي بنجاح!')
  }

  const addSubAdmin = (newAdmin: Omit<SubAdmin, 'id' | 'created_at'>) => {
    const created: SubAdmin = {
      ...newAdmin,
      id: `sub-${Date.now()}`,
      created_at: new Date().toISOString()
    }
    const updated = [created, ...subAdmins]
    setSubAdmins(updated)
    if (typeof window !== 'undefined') {
      localStorage.setItem(SUBADMINS_KEY, JSON.stringify(updated))
    }
    toast.success(`تم إضافة المسؤول (${created.name}) وتحديد الصلاحيات بنجاح!`)
  }

  const removeSubAdmin = (id: string) => {
    const updated = subAdmins.filter(s => s.id !== id)
    setSubAdmins(updated)
    if (typeof window !== 'undefined') {
      localStorage.setItem(SUBADMINS_KEY, JSON.stringify(updated))
    }
    toast.success('تم إزالة المسؤول وإلغاء صلاحياته')
  }

  const logout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
    }
    setUser(null)
    toast.success('تم تسجيل الخروج')
  }

  return (
    <AdminAuthContext.Provider value={{
      isAuthenticated: !!user, isLoading, user, subAdmins,
      login, logout, updateCredentials, addSubAdmin, removeSubAdmin
    }}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  return useContext(AdminAuthContext)
}
