import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, AutoForm, toast } from '@blinkdotnew/ui'
import { z } from 'zod'
import { TrendingUp, Shield, Lock } from 'lucide-react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useAdminAuth } from '@/lib/admin-auth'
import { useState, useEffect } from 'react'

export const Route = createFileRoute('/')({
  component: () => (
    <ErrorBoundary>
      <LoginPage />
    </ErrorBoundary>
  ),
})

const loginSchema = z.object({
  email: z.string().email({ message: 'البريد الإلكتروني غير صحيح' }),
  password: z.string().min(1, { message: 'كلمة المرور مطلوبة' }),
})

function LoginPage() {
  const navigate = useNavigate()
  const { isAuthenticated, isLoading, login } = useAdminAuth()
  const [submitting, setSubmitting] = useState(false)

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate({ to: '/admin' })
    }
  }, [isLoading, isAuthenticated, navigate])

  const handleLogin = async (data: any) => {
    setSubmitting(true)
    const success = await login(data.email, data.password)
    setSubmitting(false)
    if (success) {
      navigate({ to: '/admin' })
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B0F19]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FFD700]" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B0F19] p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-[#FFD700]/5 to-transparent pointer-events-none" />
      <div className="absolute -top-20 -right-20 w-80 h-80 bg-[#FFD700]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-[#10B981]/5 rounded-full blur-3xl pointer-events-none" />

      <Card className="w-full max-w-[420px] shadow-2xl border-[#FFD700]/20 bg-[#111827]/80 backdrop-blur-xl relative z-10 rounded-3xl">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-6">
            <div className="rounded-full bg-[#FFD700]/10 p-5 ring-8 ring-[#FFD700]/5">
              <TrendingUp className="h-12 w-12 text-[#FFD700]" />
            </div>
          </div>
          <CardTitle className="text-3xl font-black text-white">MegaTurboEarn</CardTitle>
          <CardDescription className="text-white/50 text-sm mt-2">لوحة تحكم المدير - تسجيل الدخول</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="bg-[#0B0F19]/50 rounded-2xl p-6 border border-white/5">
            <AutoForm schema={loginSchema} onSubmit={handleLogin} />
          </div>
          <div className="mt-6 text-center text-xs text-white/30 flex items-center justify-center gap-2">
            <Lock className="h-3 w-3" />
            بيانات الدخول الافتراضية: admin@megaturbo.com / admin123
          </div>
          <div className="mt-4 text-center">
            <a href="https://t.me/MegaTurboEarnBot" target="_blank" rel="noopener" className="text-xs text-[#FFD700]/60 hover:text-[#FFD700] transition-colors underline underline-offset-2">
              العودة إلى البوت ←
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
