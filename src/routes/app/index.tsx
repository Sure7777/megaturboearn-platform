import React, { useState, useEffect, useCallback } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Button, Badge } from '@blinkdotnew/ui'
import { Gift, Trophy, Star, TrendingUp, Users, ArrowRightLeft, Timer, PlayCircle, Wallet, Megaphone } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { tmaAPI, getCurrentUserId, getCurrentUserName, mockUser, type TMAUser } from '@/lib/tma-api'
import LuckyWheel from '@/components/LuckyWheel'

export const Route = createFileRoute('/app/')({ component: TMAHomePage })

const levels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  bronze: { label: 'برونزي', color: 'bg-orange-600', icon: <Star className="h-3 w-3" /> },
  silver: { label: 'فضي', color: 'bg-slate-400', icon: <Trophy className="h-3 w-3" /> },
  gold: { label: 'ذهبي', color: 'bg-yellow-500', icon: <Star className="h-3 w-3" /> },
  platinum: { label: 'بلاتيني', color: 'bg-blue-400', icon: <Trophy className="h-3 w-3" /> },
}

function TMAHomePage() {
  const userId = getCurrentUserId()
  const [showWheel, setShowWheel] = useState(false)
  const [localPoints, setLocalPoints] = useState<number | null>(null)

  // Fetch real user data
  const { data: user, isLoading } = useQuery({
    queryKey: ['tma', 'user', userId],
    queryFn: () => tmaAPI.getUser(userId),
    refetchInterval: 15_000,
  })

  const u: TMAUser = user || mockUser
  const displayName = u.display_name || getCurrentUserName()
  const points = localPoints !== null ? localPoints : (u.balance_points || 0)
  const usd = u.balance_usd || 0
  const level = u.level || 'bronze'
  const streak = u.streak_count || 0
  const levelData = levels[level] || levels.bronze
  const lastSpin = u.last_lucky_wheel || ''
  const canSpin = !lastSpin || (Date.now() - new Date(lastSpin).getTime()) > 24 * 60 * 60 * 1000

  const handleSpinResult = useCallback((prize: { label: string; points: number }) => {
    setLocalPoints(prev => (prev !== null ? prev : points) + prize.points)
    // Also call API to persist
    tmaAPI.spinLuckyWheel(userId)
  }, [userId, points])

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Welcome Section */}
      <div className="text-center space-y-2">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mx-auto w-28 h-28 rounded-full border-4 border-[#D4AF37] overflow-hidden shadow-lg bg-gradient-to-br from-[#D4AF37]/20 to-[#1A2A6C] flex items-center justify-center"
        >
          <span className="text-5xl">🦅</span>
        </motion.div>
        <h1 className="text-2xl font-black text-white pt-2">أهلاً، {displayName} 👋</h1>
        <div className="flex justify-center gap-2 items-center">
          <Badge className={`${levelData.color} text-white border-none py-1 px-3 flex items-center gap-1 shadow-md`}>
            {levelData.icon} {levelData.label}
          </Badge>
          <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-full text-[10px] font-bold border border-white/5">
            <Gift className="h-3 w-3 text-[#D4AF37]" /> {streak} أيام
          </div>
        </div>
      </div>

      {/* Balance Card */}
      <motion.div
        whileHover={{ scale: 1.01 }}
        className="bg-gradient-to-br from-[#D4AF37] to-[#B8860B] rounded-3xl p-6 shadow-2xl relative overflow-hidden group"
      >
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/20 rounded-full blur-3xl group-hover:bg-white/30 transition-all" />
        <div className="relative z-10 space-y-1">
          <p className="text-[#1A2A6C]/80 font-bold text-xs uppercase tracking-widest">إجمالي الرصيد</p>
          <div className="flex items-end gap-2">
            <h2 className="text-4xl font-black text-[#1A2A6C]">{points.toLocaleString()}</h2>
            <span className="text-[#1A2A6C] font-bold mb-1">نقطة</span>
          </div>
          <div className="flex items-center gap-1 text-[#1A2A6C]/70 font-bold">
            <TrendingUp className="h-4 w-4" />
            <span>ما يعادل ${usd.toFixed(2)} دولار</span>
          </div>
        </div>
        <Link to="/app/wallet" className="block mt-4">
          <Button className="w-full bg-[#1A2A6C] text-[#D4AF37] hover:bg-[#1A2A6C]/90 rounded-2xl font-black border-none shadow-xl text-base">
            <Wallet className="ml-2 h-4 w-4" /> المحفظة والسحب
          </Button>
        </Link>
      </motion.div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Lucky Wheel */}
        <Button
          onClick={() => setShowWheel(true)}
          className="h-32 bg-white/5 border border-white/10 rounded-3xl flex flex-col items-center justify-center gap-2 hover:bg-white/10 transition-all group active:scale-95"
        >
          <div className="p-3 bg-[#D4AF37]/20 rounded-2xl group-hover:scale-110 transition-transform">
            <Gift className="h-6 w-6 text-[#D4AF37]" />
          </div>
          <span className="font-bold text-sm">🎡 عجلة الحظ</span>
          <span className="text-[10px] text-white/40">{canSpin ? 'متاحة الآن!' : 'غير متاحة'}</span>
        </Button>

        {/* Ads shortcut */}
        <Link to="/app/ads" className="h-32 bg-white/5 border border-white/10 rounded-3xl flex flex-col items-center justify-center gap-2 hover:bg-white/10 transition-all group active:scale-95">
          <div className="p-3 bg-blue-500/20 rounded-2xl group-hover:scale-110 transition-transform">
            <Megaphone className="h-6 w-6 text-blue-400" />
          </div>
          <span className="font-bold text-sm">📺 الإعلانات</span>
          <span className="text-[10px] text-white/40">شاهد واربح</span>
        </Link>
      </div>

      {/* Today's Stats */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-[#D4AF37] border-r-4 border-[#D4AF37] pr-2">روابط سريعة</h3>
        <div className="grid grid-cols-2 gap-3">
          <Link to="/app/tasks" className="bg-white/5 rounded-2xl p-4 flex items-center gap-3 hover:bg-white/10 transition-all">
            <div className="p-2 bg-green-500/20 rounded-xl"><PlayCircle className="h-5 w-5 text-green-400" /></div>
            <div><p className="font-bold text-sm">المهام</p><p className="text-[10px] text-white/40">نفذ واربح</p></div>
          </Link>
          <Link to="/app/referrals" className="bg-white/5 rounded-2xl p-4 flex items-center gap-3 hover:bg-white/10 transition-all">
            <div className="p-2 bg-purple-500/20 rounded-xl"><Users className="h-5 w-5 text-purple-400" /></div>
            <div><p className="font-bold text-sm">الإحالات</p><p className="text-[10px] text-white/40">ادعُ واربح</p></div>
          </Link>
        </div>
      </div>

      {/* Lucky Wheel Modal */}
      <LuckyWheel
        isOpen={showWheel}
        onClose={() => setShowWheel(false)}
        onSpinResult={handleSpinResult}
        canSpin={canSpin}
        lastSpinDate={lastSpin}
      />
    </div>
  )
}
