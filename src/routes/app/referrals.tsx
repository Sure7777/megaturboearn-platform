import { createFileRoute } from '@tanstack/react-router'
import { Button, Badge, toast, Skeleton } from '@blinkdotnew/ui'
import { Users, Copy, Share2, TrendingUp, ShieldCheck } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { tmaAPI, getCurrentUserId } from '@/lib/tma-api'

export const Route = createFileRoute('/app/referrals')({ component: TMAReferralsPage })

function TMAReferralsPage() {
  const userId = getCurrentUserId()
  const referralLink = `https://t.me/MegaTurboEarnBot?start=ref_${userId}`

  const { data: refData, isLoading } = useQuery({
    queryKey: ['tma', 'referrals', userId],
    queryFn: () => tmaAPI.getReferrals(userId),
    refetchInterval: 30_000,
  })

  const stats = { level1: refData?.level1Count ?? 0, level2: refData?.level2Count ?? 0, earnings: refData?.totalEarnings ?? 0 }

  const copyLink = () => {
    navigator.clipboard?.writeText(referralLink)
    toast.success('تم نسخ الرابط')
  }

  const shareLink = () => {
    if (navigator.share) {
      navigator.share({ title: 'MegaTurboEarn', text: 'اربح من الإعلانات معي!', url: referralLink })
    } else {
      copyLink()
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="text-center space-y-4">
        <div className="mx-auto w-20 h-20 bg-blue-500/20 flex items-center justify-center rounded-3xl border border-blue-500/30">
          <Users className="h-10 w-10 text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white">نظام الإحالات</h1>
          <p className="text-white/40 text-sm">ادعُ أصدقاءك واكسب من كل نشاط يقومون به!</p>
        </div>
      </div>

      {/* Referral Link */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4 shadow-xl">
        <p className="text-xs font-bold text-[#D4AF37] uppercase tracking-widest text-center">رابط الإحالة</p>
        <div className="bg-black/20 p-4 rounded-2xl border border-white/5 flex items-center justify-between gap-2">
          <code className="text-xs text-blue-400 truncate font-mono select-all">{referralLink}</code>
        </div>
        <div className="flex gap-3">
          <Button onClick={copyLink} className="flex-1 bg-blue-600 hover:bg-blue-700 rounded-2xl font-black h-12 border-none shadow-lg gap-2">
            <Copy className="h-4 w-4" /> نسخ الرابط
          </Button>
          <Button onClick={shareLink} className="flex-1 bg-[#D4AF37] text-[#1A2A6C] hover:bg-[#D4AF37]/90 rounded-2xl font-black h-12 border-none shadow-lg gap-2">
            <Share2 className="h-4 w-4" /> مشاركة
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-5 text-center">
          {isLoading ? <Skeleton className="h-8 w-12 mx-auto rounded" /> : <p className="text-2xl font-black">{stats.level1}</p>}
          <p className="text-[10px] text-white/40 font-bold">إحالات مباشرة</p>
          <Badge className="mt-2 bg-blue-500/20 text-blue-400 border-none font-black">Level 1: 10%</Badge>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-3xl p-5 text-center">
          {isLoading ? <Skeleton className="h-8 w-12 mx-auto rounded" /> : <p className="text-2xl font-black">{stats.level2}</p>}
          <p className="text-[10px] text-white/40 font-bold">إحالات غير مباشرة</p>
          <Badge className="mt-2 bg-purple-500/20 text-purple-400 border-none font-black">Level 2: 3%</Badge>
        </div>
      </div>

      {/* Earnings */}
      <div className="bg-gradient-to-br from-blue-600/20 to-[#1A2A6C] border border-blue-500/20 rounded-3xl p-6 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">إجمالي أرباح الإحالات</p>
          <h2 className="text-3xl font-black text-white">{stats.earnings.toLocaleString()} <span className="text-sm font-bold text-white/60">نقطة</span></h2>
        </div>
        <div className="p-4 bg-blue-500/20 rounded-2xl"><TrendingUp className="h-8 w-8 text-blue-400" /></div>
      </div>

      {/* Anti-Fraud */}
      <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 flex gap-3 items-start">
        <ShieldCheck className="h-5 w-5 text-orange-400 shrink-0" />
        <p className="text-[10px] text-orange-400/80 leading-relaxed font-bold">
          نظامنا يستخدم الذكاء الاصطناعي لكشف الإحالات الوهمية. أي محاولة للتلاعب ستؤدي لحظر الحساب نهائياً مع تجميد الرصيد.
        </p>
      </div>
    </div>
  )
}
