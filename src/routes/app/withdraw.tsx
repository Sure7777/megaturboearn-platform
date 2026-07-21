import React, { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Button, Input, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, toast, Badge, Skeleton } from '@blinkdotnew/ui'
import { ArrowLeft, Send, ShieldCheck, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { tmaAPI, getCurrentUserId } from '@/lib/tma-api'

export const Route = createFileRoute('/app/withdraw')({ component: TMAWithdrawPage })

function TMAWithdrawPage() {
  const navigate = useNavigate()
  const userId = getCurrentUserId()
  const qc = useQueryClient()
  const [amount, setAmount] = useState('')
  const [network, setNetwork] = useState('TRC20')
  const [address, setAddress] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { data: user } = useQuery({
    queryKey: ['tma', 'user', userId],
    queryFn: () => tmaAPI.getUser(userId),
  })

  const { data: withdrawals } = useQuery({
    queryKey: ['tma', 'withdrawals', userId],
    queryFn: () => tmaAPI.getWithdrawals(userId),
  })

  const usdBalance = user?.balance_usd || 0
  const wList = (withdrawals || []).slice(0, 5)

  const handleWithdraw = async () => {
    if (!amount || Number(amount) < 0.20) { toast.error('الحد الأدنى للسحب هو 0.20 دولار'); return }
    if (Number(amount) > usdBalance) { toast.error('رصيدك غير كافٍ للسحب'); return }
    if (!address) { toast.error('يرجى إدخال عنوان المحفظة'); return }

    setSubmitting(true)
    const result = await tmaAPI.requestWithdrawal(userId, Number(amount), network, address)
    if (result?.success) {
      toast.success('تم إرسال طلب السحب بنجاح. سيتم المراجعة خلال 24 ساعة.')
      qc.invalidateQueries({ queryKey: ['tma', 'user', userId] })
      qc.invalidateQueries({ queryKey: ['tma', 'withdrawals', userId] })
      navigate({ to: '/app/wallet' })
    } else {
      toast.error('فشل إرسال الطلب')
    }
    setSubmitting(false)
  }

  const getStatusBadge = (status: string) => {
    const st: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
      pending: { label: 'قيد الانتظار', color: 'bg-yellow-500/20 text-yellow-400', icon: <Clock className="h-4 w-4" /> },
      completed: { label: 'مكتمل', color: 'bg-green-500/20 text-green-400', icon: <CheckCircle2 className="h-4 w-4" /> },
      rejected: { label: 'مرفوض', color: 'bg-red-500/20 text-red-400', icon: <XCircle className="h-4 w-4" /> },
    }
    return st[status] || st.pending
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="rounded-full bg-white/5 hover:bg-white/10" onClick={() => navigate({ to: '/app/wallet' })}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-black">سحب الأرباح</h1>
      </div>

      {/* Balance info */}
      <div className="bg-white/5 border border-[#D4AF37]/20 rounded-2xl p-4 flex items-center justify-between">
        <span className="text-sm text-white/60">رصيدك المتاح</span>
        <span className="text-xl font-black text-[#D4AF37]">${usdBalance.toFixed(2)}</span>
      </div>

      {/* Form */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-6 shadow-xl">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-white/40 pr-1 uppercase tracking-widest">المبلغ ($)</label>
            <Input type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)}
              className="bg-black/20 border-white/10 h-14 rounded-2xl text-xl font-black text-[#D4AF37]" />
            <div className="flex justify-between px-1">
              <span className="text-[10px] text-white/40 font-bold">الحد الأدنى: $0.20</span>
              <span className="text-[10px] text-[#D4AF37] font-bold">الرسوم: $0.06</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-white/40 pr-1 uppercase tracking-widest">الشبكة</label>
            <Select value={network} onValueChange={setNetwork}>
              <SelectTrigger className="bg-black/20 border-white/10 h-14 rounded-2xl font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1A2A6C] text-white border-white/10 rounded-xl">
                <SelectItem value="TRC20">USDT (TRC20)</SelectItem>
                <SelectItem value="BEP20">USDT (BEP20)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-white/40 pr-1 uppercase tracking-widest">عنوان المحفظة</label>
            <Input placeholder="أدخل عنوان المحفظة..." value={address} onChange={e => setAddress(e.target.value)}
              className="bg-black/20 border-white/10 h-14 rounded-2xl text-sm font-mono" />
          </div>
        </div>

        <Button onClick={handleWithdraw} disabled={submitting}
          className="w-full h-14 bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-[#1A2A6C] font-black text-lg rounded-2xl shadow-2xl border-none gap-2">
          <Send className="h-5 w-5" /> {submitting ? 'جارٍ الإرسال...' : 'إرسال الطلب'}
        </Button>
      </div>

      {/* Safety */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex gap-3 items-start">
        <ShieldCheck className="h-5 w-5 text-blue-400 shrink-0" />
        <p className="text-[10px] text-blue-400/80 leading-relaxed font-bold">
          تتم معالجة كافة الطلبات يدوياً لضمان الأمان. يرجى التأكد من صحة عنوان المحفظة والشبكة المختارة.
        </p>
      </div>

      {/* History */}
      <div className="space-y-4">
        <h3 className="font-black text-white flex items-center gap-2 px-1">
          <Clock className="h-4 w-4 text-[#D4AF37]" /> السحوبات الأخيرة
        </h3>
        <div className="space-y-3">
          {wList.length === 0 ? (
            <p className="text-center text-sm text-white/40 py-4">لا توجد طلبات سحب سابقة</p>
          ) : (
            wList.map(w => {
              const st = getStatusBadge(w.status)
              return (
                <div key={w.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${st.color}`}>{st.icon}</div>
                    <div>
                      <p className="font-bold text-sm">${w.amount_usd?.toFixed(2)}</p>
                      <p className="text-[10px] text-white/40 font-bold">{w.created_at?.slice(0, 10)}</p>
                    </div>
                  </div>
                  <Badge className={`${st.color} border-none font-bold`}>{st.label}</Badge>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
