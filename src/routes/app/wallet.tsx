import React, { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Button, Badge, toast, Skeleton } from '@blinkdotnew/ui'
import { Wallet, ArrowRightLeft, History, DollarSign, ArrowUpRight, TrendingUp, Clock } from 'lucide-react'
import { motion } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { tmaAPI, getCurrentUserId, mockUser, type TMAUser, type TMATransaction } from '@/lib/tma-api'

export const Route = createFileRoute('/app/wallet')({ component: TMAWalletPage })

function TMAWalletPage() {
  const userId = getCurrentUserId()
  const qc = useQueryClient()
  const [converting, setConverting] = useState(false)

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['tma', 'user', userId],
    queryFn: () => tmaAPI.getUser(userId),
    refetchInterval: 10_000,
  })

  const { data: txs, isLoading: txsLoading } = useQuery({
    queryKey: ['tma', 'transactions', userId],
    queryFn: () => tmaAPI.getTransactions(userId),
  })

  const u: TMAUser = user || mockUser
  const points = u.balance_points || 0
  const usd = u.balance_usd || 0

  const handleConvert = async () => {
    if (points < 100) {
      toast.error('تحتاج 100 نقطة على الأقل للتحويل')
      return
    }
    setConverting(true)
    const result = await tmaAPI.convertPoints(userId, points)
    if (result?.success) {
      toast.success(`تم تحويل ${points} نقطة إلى $${result.usd.toFixed(2)}`)
      qc.invalidateQueries({ queryKey: ['tma', 'user', userId] })
      qc.invalidateQueries({ queryKey: ['tma', 'transactions', userId] })
    } else {
      toast.error('فشل التحويل')
    }
    setConverting(false)
  }

  const txList: TMATransaction[] = (txs || []).slice(0, 10)
  const txMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    reward: { label: 'مكافأة', color: 'bg-green-500/20 text-green-400', icon: <DollarSign className="h-4 w-4" /> },
    conversion: { label: 'تحويل', color: 'bg-blue-500/20 text-blue-400', icon: <ArrowRightLeft className="h-4 w-4" /> },
    withdrawal: { label: 'سحب', color: 'bg-red-500/20 text-red-400', icon: <ArrowUpRight className="h-4 w-4" /> },
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Wallet Card */}
      <div className="bg-gradient-to-br from-[#1A2A6C] to-[#25398a] border border-white/10 rounded-[32px] p-8 space-y-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
        <div className="relative z-10 flex justify-between items-start">
          <div className="space-y-1">
            <p className="text-[10px] text-white/60 font-black uppercase tracking-[0.2em]">الرصيد القابل للسحب</p>
            <h1 className="text-5xl font-black text-white flex items-center gap-2">
              <span className="text-[#D4AF37]">$</span>{usd.toFixed(2)}
            </h1>
          </div>
          <div className="p-4 bg-white/5 rounded-3xl border border-white/10">
            <Wallet className="h-8 w-8 text-[#D4AF37]" />
          </div>
        </div>

        <div className="relative z-10 bg-black/20 p-5 rounded-2xl border border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#D4AF37]/20 rounded-xl"><TrendingUp className="h-4 w-4 text-[#D4AF37]" /></div>
            <div>
              <p className="text-[10px] text-white/40 font-bold">نقاط غير محولة</p>
              <p className="text-lg font-black">{points.toLocaleString()} نقطة</p>
            </div>
          </div>
          <Button onClick={handleConvert} disabled={converting || points < 100} variant="ghost" className="text-[#D4AF37] font-black gap-1 text-xs hover:bg-[#D4AF37]/10 rounded-xl">
            <ArrowRightLeft className="h-3 w-3" /> تحويل الكل
          </Button>
        </div>
      </div>

      {/* Withdraw Button */}
      <Button asChild className="w-full h-14 bg-[#D4AF37] text-[#1A2A6C] rounded-2xl font-black text-lg border-none shadow-xl gap-2">
        <Link to="/app/withdraw">
          <ArrowUpRight className="h-5 w-5" /> سحب الأرباح
        </Link>
      </Button>

      {/* Transaction History */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="font-black text-white flex items-center gap-2">
            <History className="h-4 w-4 text-[#D4AF37]" /> سجل العمليات
          </h3>
        </div>

        <div className="space-y-2.5">
          {txsLoading ? (
            <><Skeleton className="h-16 w-full rounded-2xl" /><Skeleton className="h-16 w-full rounded-2xl" /><Skeleton className="h-16 w-full rounded-2xl" /></>
          ) : txList.length === 0 ? (
            <div className="text-center py-8 text-white/40">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-bold">لا توجد عمليات بعد</p>
            </div>
          ) : (
            txList.map(tx => {
              const info = txMap[tx.type] || { label: tx.type, color: 'bg-white/10 text-white/60', icon: <DollarSign className="h-4 w-4" /> }
              const isPositive = tx.amount_points > 0
              return (
                <motion.div key={tx.id} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
                  className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between group hover:bg-white/10 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${info.color}`}>{info.icon}</div>
                    <div>
                      <p className="font-bold text-sm">{info.label}</p>
                      <p className="text-[10px] text-white/40 font-bold">{tx.description || tx.created_at?.slice(0, 10)}</p>
                    </div>
                  </div>
                  <p className={`font-black text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                    {isPositive ? '+' : ''}{tx.amount_points} <span className="text-[10px] opacity-60">نقطة</span>
                  </p>
                </motion.div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
