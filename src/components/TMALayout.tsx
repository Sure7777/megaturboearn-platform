import React, { useState, useEffect, useCallback, useRef } from 'react'
import { AppShell, Button, Badge, Card, CardHeader, CardTitle, CardContent, toast, Skeleton } from '@blinkdotnew/ui'
import {
  Home,
  Megaphone,
  CheckSquare,
  Users,
  Wallet,
  Gift,
  Trophy,
  Star,
  TrendingUp,
  ArrowRightLeft,
  Timer,
  PlayCircle,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Send,
  ExternalLink,
  Lock,
  ArrowUpRight,
  Sparkles,
  ChevronLeft,
  X,
  Smartphone
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { tmaAPI, getCurrentUserId, getCurrentUserName, mockUser, type TMAUser, type TMAItem, type TMATransaction } from '@/lib/tma-api'

export function TMALayout() {
  const userId = getCurrentUserId()
  const userName = getCurrentUserName()

  // State-based Tab System
  const [activeTab, setActiveTab] = useState<'home' | 'ads' | 'tasks' | 'referrals' | 'wallet'>('home')

  // Core Applet State
  const [userProfile, setUserProfile] = useState<TMAUser>(mockUser)
  const [userTxs, setUserTxs] = useState<TMATransaction[]>([])
  const [withdrawals, setWithdrawals] = useState<any[]>([])
  const [referralStats, setReferralStats] = useState({ level1Count: 3, level2Count: 1, totalEarnings: 0.15 })
  const [loading, setLoading] = useState(true)

  // Sub-tabs for Ads
  const [activeAdTab, setActiveAdTab] = useState<'short' | 'long'>('short')
  const [adItems, setAdItems] = useState<TMAItem[]>([])
  const [taskItems, setTaskItems] = useState<TMAItem[]>([])

  // Active watching/verification states
  const [activeItemWatching, setActiveItemWatching] = useState<TMAItem | null>(null)
  const [countdown, setCountdown] = useState(0)
  const [watchingType, setWatchingType] = useState<'short' | 'long' | 'task'>('short')
  const [luckyWheelOpen, setLuckyWheelOpen] = useState(false)
  const [isWheelSpinning, setIsWheelSpinning] = useState(false)
  const [wheelRotation, setWheelRotation] = useState(0)

  // Input states for convert and withdraw
  const [convertPointsInput, setConvertPointsInput] = useState('')
  const [withdrawAmountUsd, setWithdrawAmountUsd] = useState('')
  const [withdrawNetwork, setWithdrawNetwork] = useState<'TRC20' | 'BEP20'>('TRC20')
  const [withdrawWalletAddress, setWithdrawWalletAddress] = useState('')
  const [withdrawingInProgress, setWithdrawingInProgress] = useState(false)

  // Seed initial demo/database items if nothing fetched
  const fallbackAdsShort: TMAItem[] = [
    { id: 'ad-s-1', group_id: 'g-s-1', name: 'شاهد إعلان لربح مكافأة سريعة', type: 'short', reward_points: 1500, url: 'https://example.com/ad1', daily_limit: 5, current_completions: 0, max_total_completions: 1000, is_active: 1 },
    { id: 'ad-s-2', group_id: 'g-s-1', name: 'زيارة موقع ممول للمستثمرين', type: 'short', reward_points: 2500, url: 'https://example.com/ad2', daily_limit: 3, current_completions: 0, max_total_completions: 1000, is_active: 1 },
    { id: 'ad-s-3', group_id: 'g-s-1', name: 'مشاهدة فيديو ترويجي لشركة العملات', type: 'short', reward_points: 3000, url: 'https://example.com/ad3', daily_limit: 2, current_completions: 0, max_total_completions: 1000, is_active: 1 }
  ]

  const fallbackAdsLong: TMAItem[] = [
    { id: 'ad-l-1', group_id: 'g-l-1', name: 'شاهد فيديو 30 ثانية لجمع الذهب', type: 'long', reward_points: 5000, url: 'https://example.com/ad4', daily_limit: 1, current_completions: 0, max_total_completions: 500, is_active: 1 },
    { id: 'ad-l-2', group_id: 'g-l-1', name: 'عرض إعلاني مدفوع برعاية Adsgram', type: 'long', reward_points: 5900, url: 'https://example.com/ad5', daily_limit: 2, current_completions: 0, max_total_completions: 500, is_active: 1 }
  ]

  const fallbackTasks: TMAItem[] = [
    { id: 'task-1', group_id: 'g-t-1', name: 'متابعة قناة تليجرام الرسمية للمشروع', type: 'task', reward_points: 2000, url: 'https://t.me/Sure7777', daily_limit: 1, current_completions: 0, max_total_completions: 10000, is_active: 1 },
    { id: 'task-2', group_id: 'g-t-1', name: 'زيارة موقع الشريك الاستراتيجي والتسجيل', type: 'task', reward_points: 1500, url: 'https://google.com', daily_limit: 1, current_completions: 0, max_total_completions: 10000, is_active: 1 },
    { id: 'task-3', group_id: 'g-t-1', name: 'الانضمام لمجموعة نقاشات الدعم للبوت', type: 'task', reward_points: 1900, url: 'https://t.me/Sure7777', daily_limit: 1, current_completions: 0, max_total_completions: 10000, is_active: 1 },
    { id: 'task-4', group_id: 'g-t-1', name: 'بدء بوت الاستثمار الشريك', type: 'task', reward_points: 1000, url: 'https://t.me/Sure7777', daily_limit: 1, current_completions: 0, max_total_completions: 10000, is_active: 1 }
  ]

  // Synchronize data from Database + Fallbacks
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // 1. User profile
      const user = await tmaAPI.getUser(userId)
      if (user) {
        setUserProfile(user)
      } else {
        // Look in localStorage to persist demo state
        const stored = localStorage.getItem(`tma_user_${userId}`)
        if (stored) {
          setUserProfile(JSON.parse(stored))
        } else {
          const fresh = { ...mockUser, id: userId, display_name: userName }
          setUserProfile(fresh)
          localStorage.setItem(`tma_user_${userId}`, JSON.stringify(fresh))
        }
      }

      // 2. Transactions
      const txs = await tmaAPI.getTransactions(userId)
      if (txs && txs.length > 0) {
        setUserTxs(txs)
      } else {
        const localTxs = localStorage.getItem(`tma_txs_${userId}`)
        if (localTxs) {
          setUserTxs(JSON.parse(localTxs))
        } else {
          const initialTxs: TMATransaction[] = [
            { id: 'tx-init', user_id: userId, type: 'reward', amount_points: 250, amount_usd: 0, description: 'هدية الترحيب بالبونص الأول', created_at: new Date().toISOString() }
          ]
          setUserTxs(initialTxs)
          localStorage.setItem(`tma_txs_${userId}`, JSON.stringify(initialTxs))
        }
      }

      // 3. Withdrawals
      const withs = await tmaAPI.getWithdrawals(userId)
      if (withs && withs.length > 0) {
        setWithdrawals(withs)
      } else {
        const localWiths = localStorage.getItem(`tma_withs_${userId}`)
        if (localWiths) {
          setWithdrawals(JSON.parse(localWiths))
        } else {
          setWithdrawals([])
        }
      }

      // 4. Referrals count
      const refs = await tmaAPI.getReferrals(userId)
      if (refs) {
        setReferralStats(refs)
      }

      // 5. Fetch Ads and Tasks
      const shorts = await tmaAPI.getItems('short')
      const longs = await tmaAPI.getItems('long')
      const tasks = await tmaAPI.getItems('task')

      setAdItems([...(shorts && shorts.length > 0 ? shorts : fallbackAdsShort), ...(longs && longs.length > 0 ? longs : fallbackAdsLong)])
      setTaskItems(tasks && tasks.length > 0 ? tasks : fallbackTasks)

    } catch (e) {
      console.error('Error fetching data from API:', e)
    } finally {
      setLoading(false)
    }
  }, [userId, userName])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Save state back locally when we update user profile in sandbox mode
  const updateLocalUser = (updatedUser: TMAUser) => {
    setUserProfile(updatedUser)
    localStorage.setItem(`tma_user_${userId}`, JSON.stringify(updatedUser))
  }

  const addLocalTransaction = (type: string, points: number, usd: number, desc: string) => {
    const newTx: TMATransaction = {
      id: crypto.randomUUID(),
      user_id: userId,
      type,
      amount_points: points,
      amount_usd: usd,
      description: desc,
      created_at: new Date().toISOString()
    }
    const updated = [newTx, ...userTxs]
    setUserTxs(updated)
    localStorage.setItem(`tma_txs_${userId}`, JSON.stringify(updated))
  }

  // Handle active watchcountdown
  useEffect(() => {
    let timer: any
    if (activeItemWatching && countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => prev - 1)
      }, 1000)
    } else if (activeItemWatching && countdown === 0) {
      // Reward completion
      completeActiveItem()
    }
    return () => clearInterval(timer)
  }, [activeItemWatching, countdown])

  // Complete item call
  const startWatchingItem = (item: TMAItem, type: 'short' | 'long' | 'task') => {
    // Open URL in new window/tab safely
    try {
      window.open(item.url, '_blank')
    } catch {}

    setActiveItemWatching(item)
    setWatchingType(type)
    // 5 seconds for short, 15 seconds for long, 8 seconds for tasks verification
    setCountdown(type === 'short' ? 5 : type === 'long' ? 12 : 8)
    toast.info(`بدأ العداد التنازلي للتأكيد، يرجى عدم إغلاق الواجهة!`)
  }

  const completeActiveItem = async () => {
    if (!activeItemWatching) return
    const item = activeItemWatching
    setActiveItemWatching(null)

    try {
      const res = await tmaAPI.completeItem(userId, item.id, watchingType)
      if (res && res.success) {
        toast.success(`🎉 مبروك! كسبت +${res.points} نقطة بنجاح!`)
        loadData()
      } else {
        // Fallback local mode
        const earned = item.reward_points
        const updatedPoints = userProfile.balance_points + earned
        const updatedUsd = userProfile.balance_usd + (earned / 1000)
        
        updateLocalUser({
          ...userProfile,
          balance_points: updatedPoints,
          balance_usd: updatedUsd
        })
        addLocalTransaction('reward', earned, 0, `مشاهدة إعلان: ${item.name}`)
        toast.success(`🎉 مبروك! تمت إضافة +${earned} نقطة محلياً!`)
      }
    } catch (e) {
      toast.error('حدث خطأ أثناء الاتصال بالخادم')
    }
  }

  // Spin Lucky Wheel Game
  const spinLuckyWheel = async () => {
    if (isWheelSpinning) return

    // Cooldown check (24h)
    if (userProfile.last_lucky_wheel) {
      const last = new Date(userProfile.last_lucky_wheel).getTime()
      if (Date.now() - last < 24 * 60 * 60 * 1000) {
        toast.error('يمكنك تدوير العجلة مرة واحدة كل 24 ساعة!')
        return
      }
    }

    setIsWheelSpinning(true)
    const sectors = [5, 10, 20, 30, 50, 100, 200, 500]
    const chosenPrizePoints = sectors[Math.floor(Math.random() * sectors.length)]

    // Start rotation animation
    const degrees = 1800 + Math.floor(Math.random() * 360)
    setWheelRotation(degrees)

    setTimeout(async () => {
      setIsWheelSpinning(false)
      setLuckyWheelOpen(false)

      try {
        const res = await tmaAPI.spinLuckyWheel(userId)
        if (res && res.success) {
          toast.success(`🎡 مبروك! ربحت ${res.points} نقطة من عجلة الحظ!`)
          loadData()
        } else {
          // Fallback simulation
          const updatedUser = {
            ...userProfile,
            balance_points: userProfile.balance_points + chosenPrizePoints,
            last_lucky_wheel: new Date().toISOString()
          }
          updateLocalUser(updatedUser)
          addLocalTransaction('lucky_wheel', chosenPrizePoints, 0, 'مكافأة عجلة الحظ اليومية')
          toast.success(`🎡 مبروك محلياً! ربحت ${chosenPrizePoints} نقطة!`)
        }
      } catch {
        toast.error('فشل إرسال الجائزة للخادم')
      }
    }, 4000)
  }

  // Convert points to USD
  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault()
    const pts = parseInt(convertPointsInput)
    if (isNaN(pts) || pts <= 0) {
      toast.error('الرجاء إدخال عدد نقاط صحيح')
      return
    }
    if (pts > userProfile.balance_points) {
      toast.error('رصيد النقاط لديك غير كافٍ')
      return
    }

    try {
      const res = await tmaAPI.convertPoints(userId, pts)
      if (res && res.success) {
        toast.success(`✅ تم تحويل النقاط بنجاح وكسبت $${res.usd.toFixed(2)} USDT!`)
        setConvertPointsInput('')
        loadData()
      } else {
        // Fallback simulate conversion
        const usdEarned = pts / 1000
        const updatedPoints = userProfile.balance_points - pts
        const updatedUsd = userProfile.balance_usd + usdEarned

        updateLocalUser({
          ...userProfile,
          balance_points: updatedPoints,
          balance_usd: updatedUsd
        })
        addLocalTransaction('conversion', -pts, usdEarned, `تحويل نقاط: ${pts} ← $${usdEarned.toFixed(2)}`)
        setConvertPointsInput('')
        toast.success(`✅ تم التحويل محلياً! نقاط: ${pts} ← $${usdEarned.toFixed(2)}`)
      }
    } catch {
      toast.error('خطأ أثناء عملية التحويل')
    }
  }

  // Submit withdrawal request
  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(withdrawAmountUsd)
    if (isNaN(amount) || amount <= 0) {
      toast.error('الرجاء إدخال مبلغ سحب صحيح')
      return
    }
    if (amount < 0.20) {
      toast.error('الحد الأدنى لطلب السحب هو 0.20 USDT')
      return
    }
    if (amount > userProfile.balance_usd) {
      toast.error('رصيدك المتاح للسحب غير كافٍ')
      return
    }
    if (!withdrawWalletAddress || withdrawWalletAddress.trim().length < 24) {
      toast.error('الرجاء إدخال عنوان محفظة صحيح (مثال: TRC20 أو BEP20)')
      return
    }

    setWithdrawingInProgress(true)
    try {
      const res = await tmaAPI.requestWithdrawal(userId, amount, withdrawNetwork, withdrawWalletAddress)
      if (res && res.success) {
        toast.success(`🚀 تم إرسال طلب السحب بنجاح وهو قيد المراجعة الإدارية الآن!`)
        setWithdrawAmountUsd('')
        setWithdrawWalletAddress('')
        loadData()
      } else {
        // Fallback simulate withdrawal
        const updatedUsd = userProfile.balance_usd - amount
        updateLocalUser({
          ...userProfile,
          balance_usd: updatedUsd
        })
        
        const newWithdrawal = {
          id: crypto.randomUUID(),
          user_id: userId,
          amount_usd: amount,
          network: withdrawNetwork,
          wallet_address: withdrawWalletAddress,
          status: 'pending',
          created_at: new Date().toISOString()
        }

        const updatedWiths = [newWithdrawal, ...withdrawals]
        setWithdrawals(updatedWiths)
        localStorage.setItem(`tma_withs_${userId}`, JSON.stringify(updatedWiths))

        addLocalTransaction('withdrawal', 0, -amount, `طلب سحب معلق: $${amount.toFixed(2)}`)
        setWithdrawAmountUsd('')
        setWithdrawWalletAddress('')
        toast.success(`🚀 تم إرسال طلب السحب محلياً ($${amount.toFixed(2)})!`)
      }
    } catch {
      toast.error('فشل إرسال طلب السحب')
    } finally {
      setWithdrawingInProgress(false)
    }
  }

  // Display labels
  const levels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    bronze: { label: 'برونزي', color: 'bg-gradient-to-r from-orange-600 to-amber-700', icon: <Star className="h-3 w-3" /> },
    silver: { label: 'فضي', color: 'bg-gradient-to-r from-slate-400 to-slate-500', icon: <Trophy className="h-3 w-3" /> },
    gold: { label: 'ذهبي متميز', color: 'bg-gradient-to-r from-yellow-500 to-amber-500', icon: <Sparkles className="h-3 w-3" /> },
    platinum: { label: 'بلاتيني كبار', color: 'bg-gradient-to-r from-blue-500 to-cyan-500', icon: <Trophy className="h-3 w-3" /> },
  }

  const userLevel = userProfile.level || 'bronze'
  const levelData = levels[userLevel] || levels.bronze

  // Copy referral link
  const refLink = `https://t.me/MegaTurboEarnBot?start=ref_${userId}`
  const copyLink = () => {
    navigator.clipboard.writeText(refLink)
    toast.success('تم نسخ رابط الإحالة الخاص بك بنجاح!')
  }

  return (
    <div className="flex h-screen w-full flex-col bg-[#0B0F19] text-white font-['Cairo'] relative overflow-hidden select-none">
      
      {/* Visual background gradient blurs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-[#10B981]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 left-10 w-72 h-72 bg-[#FFD700]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Content Pane */}
      <div className="flex-1 overflow-y-auto px-4 pt-6 pb-28 scrollbar-hide relative z-10">
        
        {/* Active Timer Countdown Floating Overlay */}
        {activeItemWatching && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
            <div className="relative mb-6">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle cx="48" cy="48" r="40" stroke="#1F2937" strokeWidth="6" fill="transparent" />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="#FFD700"
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray={251.2}
                  strokeDashoffset={251.2 - (251.2 * (countdown / (watchingType === 'short' ? 5 : watchingType === 'long' ? 12 : 8)))}
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-3xl font-black text-[#FFD700]">
                {countdown}
              </div>
            </div>

            <h3 className="text-xl font-bold mb-2">جاري مشاهدة الإعلان والتحقق...</h3>
            <p className="text-white/60 text-xs max-w-xs leading-relaxed">
              يرجى عدم إغلاق هذه الشاشة أو التبديل. يتم تسجيل نقاطك مباشرة في الخزنة بمجرد انتهاء المؤقت!
            </p>
            <div className="mt-8 flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 px-4 py-2 rounded-2xl text-xs text-[#FFD700] animate-pulse">
              <Timer className="h-4 w-4" /> جاري التشغيل الآمن للبث التلفزيوني
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-6 pt-10">
            <Skeleton className="h-12 w-2/3 mx-auto" />
            <Skeleton className="h-32 w-full rounded-3xl" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            
            {/* TAB 1: HOME PAGE */}
            {activeTab === 'home' && (
              <motion.div key="home" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-6">
                
                {/* Header Welcome Bar */}
                <div className="flex items-center justify-between bg-[#111827]/40 p-3 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full border-2 border-[#FFD700] overflow-hidden bg-[#161F30] flex items-center justify-center font-black text-xl text-[#FFD700]">
                      {userName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold">مرحباً، {userName}</h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[9px] px-2 py-0.2 rounded-full font-bold text-white ${levelData.color}`}>
                          المستوى: {levelData.label}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20 text-xs font-black text-[#FFD700]">
                    <Gift className="h-3.5 w-3.5" />
                    <span>{userProfile.streak_count} أيام متتالية</span>
                  </div>
                </div>

                {/* Big Interactive Balance Card */}
                <div className="bg-gradient-to-br from-[#161F30] via-[#0E1626] to-[#0B0F19] border-2 border-[#FFD700]/10 rounded-[32px] p-6 shadow-2xl relative overflow-hidden group">
                  <div className="absolute -top-16 -right-16 w-44 h-44 bg-[#FFD700]/5 rounded-full blur-2xl group-hover:bg-[#FFD700]/10 transition-all" />
                  
                  <p className="text-white/50 font-bold text-xs uppercase tracking-widest text-right">إجمالي رصيد النقاط</p>
                  <div className="flex items-baseline justify-between mt-2">
                    <div className="flex items-baseline gap-2">
                      <h2 className="text-5xl font-black text-[#FFD700] tracking-tight">{userProfile.balance_points.toLocaleString()}</h2>
                      <span className="text-xs text-white/50 font-bold">نقطة ذهبية</span>
                    </div>
                    <Badge className="bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/25 py-1 px-3 text-sm font-black">
                      ${userProfile.balance_usd.toFixed(2)} USDT
                    </Badge>
                  </div>

                  {/* Quick level indicator bar */}
                  <div className="mt-5 space-y-1">
                    <div className="flex justify-between text-[10px] text-white/40">
                      <span>الترقية القادمة (بلاتيني)</span>
                      <span>{userProfile.balance_points} / 50,000 نقطة</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#FFD700] to-[#10B981]" style={{ width: `${Math.min(100, (userProfile.balance_points / 50000) * 100)}%` }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-6">
                    <Button onClick={() => setActiveTab('wallet')} className="w-full bg-[#FFD700] hover:bg-[#FFD700]/90 text-black font-black py-3 rounded-2xl transition-all border-none flex items-center justify-center gap-1.5 text-xs shadow-lg shadow-[#FFD700]/5">
                      <ArrowRightLeft className="h-3.5 w-3.5" /> تحويل سريع للدولار
                    </Button>
                    <Button onClick={() => setActiveTab('wallet')} className="w-full bg-[#111827] hover:bg-[#1f2937] text-white border border-white/10 font-bold py-3 rounded-2xl transition-all flex items-center justify-center gap-1.5 text-xs">
                      <Wallet className="h-3.5 w-3.5 text-[#10B981]" /> طلب سحب فوري
                    </Button>
                  </div>
                </div>

                {/* Grid shortcuts */}
                <div className="grid grid-cols-2 gap-3">
                  <div onClick={() => setLuckyWheelOpen(true)} className="bg-[#161F30]/40 border border-[#FFD700]/10 rounded-2xl p-4 flex flex-col items-center text-center justify-center gap-2 cursor-pointer hover:bg-[#161F30]/70 transition-all group active:scale-95">
                    <div className="p-3 bg-[#FFD700]/10 text-[#FFD700] rounded-xl group-hover:scale-110 transition-transform">
                      <Gift className="h-6 w-6 animate-bounce" />
                    </div>
                    <span className="font-bold text-sm text-[#FFD700]">عجلة الحظ</span>
                    <span className="text-[10px] text-white/40">اضغط للتدوير اليومي</span>
                  </div>

                  <div onClick={() => setActiveTab('ads')} className="bg-[#161F30]/40 border border-white/5 rounded-2xl p-4 flex flex-col items-center text-center justify-center gap-2 cursor-pointer hover:bg-[#161F30]/70 transition-all group active:scale-95">
                    <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl group-hover:scale-110 transition-transform">
                      <Megaphone className="h-6 w-6" />
                    </div>
                    <span className="font-bold text-sm text-white/90">الإعلانات المدفوعة</span>
                    <span className="text-[10px] text-white/40">شاهد وإربح فورا</span>
                  </div>
                </div>

                {/* Stats widget panel */}
                <div className="bg-[#111827]/30 border border-white/5 rounded-2xl p-4 space-y-3">
                  <h3 className="text-xs font-bold text-[#FFD700] border-r-4 border-[#FFD700] pr-2">أرباح اليوم والنشاطات</h3>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-black/20 p-2.5 rounded-xl border border-white/5">
                      <p className="text-[10px] text-white/40">المهام المنفذة</p>
                      <p className="text-sm font-black text-[#10B981] mt-0.5">5 مهام</p>
                    </div>
                    <div className="bg-black/20 p-2.5 rounded-xl border border-white/5">
                      <p className="text-[10px] text-white/40">مكافآت الإعلان</p>
                      <p className="text-sm font-black text-blue-400 mt-0.5">2,400 نقطة</p>
                    </div>
                    <div className="bg-black/20 p-2.5 rounded-xl border border-white/5">
                      <p className="text-[10px] text-white/40">أرباح الإحالة</p>
                      <p className="text-sm font-black text-[#FFD700] mt-0.5">$0.15</p>
                    </div>
                  </div>
                </div>

                {/* Lucky Wheel Modal Popup */}
                {luckyWheelOpen && (
                  <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#111827] border-2 border-[#FFD700] rounded-[36px] p-6 w-full max-w-sm text-center relative overflow-hidden">
                      <button onClick={() => setLuckyWheelOpen(false)} className="absolute top-4 right-4 text-white/60 hover:text-white bg-white/5 p-1 rounded-full"><X className="h-5 w-5" /></button>
                      
                      <h3 className="text-xl font-black text-[#FFD700] mt-2 mb-1">🎡 عجلة الحظ الكبرى</h3>
                      <p className="text-xs text-white/50 mb-6">دور العجلة الذهبية لربح ما يصل إلى 500 نقطة فورية!</p>

                      <div className="relative w-64 h-64 mx-auto mb-6 flex items-center justify-center">
                        {/* Wheel Pinpointer */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[20px] border-t-[#FFD700]" />
                        
                        {/* Interactive Rotating wheel visual */}
                        <div
                          className="w-full h-full rounded-full border-4 border-[#FFD700] shadow-[0_0_20px_rgba(255,215,0,0.2)] bg-gradient-to-br from-indigo-950 to-slate-900 overflow-hidden relative flex items-center justify-center transition-all"
                          style={{
                            transform: `rotate(${wheelRotation}deg)`,
                            transition: isWheelSpinning ? 'transform 4s cubic-bezier(0.15, 0.85, 0.25, 1)' : 'none'
                          }}
                        >
                          <svg viewBox="0 0 100 100" className="w-full h-full">
                            {/* Colorful segments */}
                            <g stroke="#111827" strokeWidth="0.5">
                              <path d="M50,50 L50,0 A50,50 0 0,1 85.3,14.6 Z" fill="#FFD700" opacity="0.9" />
                              <path d="M50,50 L85.3,14.6 A50,50 0 0,1 100,50 Z" fill="#1E293B" />
                              <path d="M50,50 L100,50 A50,50 0 0,1 85.3,85.3 Z" fill="#FFD700" opacity="0.85" />
                              <path d="M50,50 L85.3,85.3 A50,50 0 0,1 50,100 Z" fill="#1E293B" />
                              <path d="M50,50 L50,100 A50,50 0 0,1 14.6,85.3 Z" fill="#FFD700" opacity="0.9" />
                              <path d="M50,50 L14.6,85.3 A50,50 0 0,1 0,50 Z" fill="#1E293B" />
                              <path d="M50,50 L0,50 A50,50 0 0,1 14.6,14.6 Z" fill="#FFD700" opacity="0.85" />
                              <path d="M50,50 L14.6,14.6 A50,50 0 0,1 50,0 Z" fill="#1E293B" />
                            </g>
                            <circle cx="50" cy="50" r="10" fill="#FFD700" stroke="#111827" strokeWidth="1" />
                          </svg>
                          <div className="absolute font-black text-xs text-black bg-[#FFD700] rounded-full px-2 py-0.5">SPIN</div>
                        </div>
                      </div>

                      <Button
                        disabled={isWheelSpinning}
                        onClick={spinLuckyWheel}
                        className="w-full bg-[#FFD700] hover:bg-[#FFD700]/90 text-black font-black py-3 rounded-2xl border-none shadow-lg shadow-[#FFD700]/5"
                      >
                        {isWheelSpinning ? 'جاري تدوير العجلة...' : 'دور الآن مجاناً'}
                      </Button>
                      <p className="text-[10px] text-white/30 mt-3">العجلة متاحة مجاناً مرة واحدة كل 24 ساعة</p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* TAB 2: ADS PAGE */}
            {activeTab === 'ads' && (
              <motion.div key="ads" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-6">
                <div className="text-center space-y-1">
                  <h2 className="text-xl font-black text-white">📺 كسب الذهب من مشاهدة الإعلانات</h2>
                  <p className="text-xs text-white/50">شاهد الإعلانات المميزة بانتظام لزيادة رصيد نقاطك</p>
                </div>

                {/* Sub tabs for Ad type */}
                <div className="grid grid-cols-2 bg-black/30 p-1 rounded-xl border border-white/5">
                  <button
                    onClick={() => setActiveAdTab('short')}
                    className={`py-2 text-xs font-bold rounded-lg transition-all ${activeAdTab === 'short' ? 'bg-[#FFD700] text-black font-black' : 'text-white/60 hover:text-white'}`}
                  >
                    إعلانات مميزة (سريعة)
                  </button>
                  <button
                    onClick={() => setActiveAdTab('long')}
                    className={`py-2 text-xs font-bold rounded-lg transition-all ${activeAdTab === 'long' ? 'bg-[#FFD700] text-black font-black' : 'text-white/60 hover:text-white'}`}
                  >
                    إعلانات ترويجية (عالية القيمة)
                  </button>
                </div>

                <div className="space-y-3">
                  {adItems.filter(item => item.type === activeAdTab).map((item) => (
                    <div key={item.id} className="bg-[#111827]/40 border border-white/5 rounded-2xl p-4 flex items-center justify-between hover:bg-[#111827]/70 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
                          <PlayCircle className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white/95 leading-snug">{item.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-[#FFD700] font-black">+{item.reward_points} نقطة</span>
                            <span className="text-[9px] text-white/30">الحد اليومي: {item.daily_limit}</span>
                          </div>
                        </div>
                      </div>

                      <Button
                        onClick={() => startWatchingItem(item, activeAdTab)}
                        className="bg-[#10B981] hover:bg-[#10B981]/90 text-white font-black text-xs px-4 h-9 rounded-xl border-none"
                      >
                        شاهد
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex gap-3 items-start">
                  <Sparkles className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-blue-400 leading-relaxed">
                    يتم جلب الإعلانات في تليجرام باستخدام شبكة <b>Adsgram</b> المدمجة بشكل فوري لضمان أعلى عوائد أرباح على السحوبات. يرجى الانتظار لحين تحميل الإعلان بالكامل.
                  </p>
                </div>
              </motion.div>
            )}

            {/* TAB 3: TASKS PAGE */}
            {activeTab === 'tasks' && (
              <motion.div key="tasks" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-6">
                <div className="text-center space-y-1">
                  <h2 className="text-xl font-black text-white">📝 قائمة المهام المتاحة</h2>
                  <p className="text-xs text-white/50 font-medium">نفذ مهام قنوات التليجرام والمواقع لربح النقاط الذهبية</p>
                </div>

                <div className="space-y-3">
                  {taskItems.map((task) => (
                    <div key={task.id} className="bg-[#111827]/40 border border-white/5 rounded-2xl p-4 flex items-center justify-between hover:bg-[#111827]/70 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl">
                          <CheckSquare className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white/90 leading-snug">{task.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-[#FFD700] font-black">+{task.reward_points} نقطة</span>
                            <span className="text-[9px] text-white/30">مهمة لمرة واحدة</span>
                          </div>
                        </div>
                      </div>

                      <Button
                        onClick={() => startWatchingItem(task, 'task')}
                        className="bg-[#FFD700] hover:bg-[#FFD700]/90 text-black font-black text-xs px-4 h-9 rounded-xl border-none"
                      >
                        إتمام
                      </Button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* TAB 4: REFERRALS PAGE */}
            {activeTab === 'referrals' && (
              <motion.div key="referrals" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-6">
                <div className="text-center space-y-1">
                  <h2 className="text-xl font-black text-white">👥 نظام الإحالات والمستويات</h2>
                  <p className="text-xs text-white/50">ادعُ أصدقاءك وانشئ شبكتك الخاصة لربح عمولات مستمرة</p>
                </div>

                {/* Referral Link Copy widget */}
                <div className="bg-[#111827]/40 border border-[#FFD700]/10 rounded-2xl p-4 space-y-3 text-center">
                  <p className="text-xs text-white/60">رابط الإحالة الخاص بك</p>
                  <div className="flex items-center gap-2 bg-black/40 p-2.5 rounded-xl border border-white/5 font-mono text-xs select-all justify-between text-yellow-400 text-left">
                    <span className="truncate max-w-[200px]">{refLink}</span>
                    <button onClick={copyLink} className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white">
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                  <Button onClick={copyLink} className="w-full bg-[#FFD700] hover:bg-[#FFD700]/95 text-black font-black py-2.5 rounded-xl text-xs border-none flex justify-center items-center gap-1">
                    <Copy className="h-3.5 w-3.5" /> نسخ ومشاركة الرابط
                  </Button>
                </div>

                {/* Referrals breakdown cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-[#111827]/30 border border-white/5 p-3 rounded-2xl text-center">
                    <p className="text-[10px] text-white/40">إحالات المستوى 1</p>
                    <p className="text-lg font-black text-[#FFD700] mt-0.5">{referralStats.level1Count} صديق</p>
                    <p className="text-[8px] text-white/30 mt-0.5">عمولة 10%</p>
                  </div>
                  <div className="bg-[#111827]/30 border border-white/5 p-3 rounded-2xl text-center">
                    <p className="text-[10px] text-white/40">إحالات المستوى 2</p>
                    <p className="text-lg font-black text-blue-400 mt-0.5">{referralStats.level2Count} أصدقاء</p>
                    <p className="text-[8px] text-white/30 mt-0.5">عمولة 3%</p>
                  </div>
                  <div className="bg-[#111827]/30 border border-white/5 p-3 rounded-2xl text-center">
                    <p className="text-[10px] text-white/40">إجمالي الأرباح</p>
                    <p className="text-lg font-black text-[#10B981] mt-0.5">${referralStats.totalEarnings.toFixed(2)}</p>
                    <p className="text-[8px] text-white/30 mt-0.5">دولار سحب</p>
                  </div>
                </div>

                {/* Referral List Mockup */}
                <div className="bg-[#111827]/30 border border-white/5 rounded-2xl p-4">
                  <h4 className="text-xs font-bold text-white/70 mb-3 text-right">قائمة آخر المدعوين</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                      <span className="font-bold text-white/90">@user123</span>
                      <span className="text-emerald-400 font-bold">+$0.10</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                      <span className="font-bold text-white/90">@user456</span>
                      <span className="text-emerald-400 font-bold">+$0.05</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5">
                      <span className="font-bold text-white/90">@user789</span>
                      <span className="text-emerald-400 font-bold">+$0.00</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 5: WALLET PAGE */}
            {activeTab === 'wallet' && (
              <motion.div key="wallet" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-6">
                <div className="text-center space-y-1">
                  <h2 className="text-xl font-black text-white">💼 المحفظة والعمليات المالية</h2>
                  <p className="text-xs text-white/50">حول نقاطك الذهبية إلى رصيد دولار USDT وقم بسحبه لمحفظتك</p>
                </div>

                {/* Real-time Balances */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gradient-to-br from-[#161F30] to-black border border-[#FFD700]/20 p-4 rounded-2xl text-center relative overflow-hidden">
                    <span className="text-[10px] text-white/40 block">الرصيد الكلي بالنقاط</span>
                    <span className="text-2xl font-black text-[#FFD700] mt-1 block">{userProfile.balance_points.toLocaleString()}</span>
                  </div>

                  <div className="bg-gradient-to-br from-[#0F1D1A] to-black border border-[#10B981]/20 p-4 rounded-2xl text-center relative overflow-hidden">
                    <span className="text-[10px] text-white/40 block">الرصيد المتاح للسحب</span>
                    <span className="text-2xl font-black text-[#10B981] mt-1 block">${userProfile.balance_usd.toFixed(2)} USDT</span>
                  </div>
                </div>

                {/* Instant Conversion Tool */}
                <Card className="bg-[#111827]/40 border-white/5 p-4 rounded-2xl">
                  <h4 className="text-xs font-bold text-[#FFD700] mb-3 flex items-center gap-1 justify-end">
                    <ArrowRightLeft className="h-4 w-4" /> تحويل فوري للنقاط إلى USDT
                  </h4>

                  <form onSubmit={handleConvert} className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-white/40">
                        <span>معدل التحويل: 1000 نقطة = $1.00 USDT</span>
                        <span>رصيدك: {userProfile.balance_points} نقطة</span>
                      </div>
                      <input
                        type="number"
                        placeholder="أدخل عدد النقاط لتحويلها"
                        value={convertPointsInput}
                        onChange={(e) => setConvertPointsInput(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700] outline-none"
                      />
                    </div>
                    <Button type="submit" className="w-full bg-[#FFD700] hover:bg-[#FFD700]/95 text-black font-black py-2 rounded-xl text-xs border-none">
                      تحويل النقاط الآن
                    </Button>
                  </form>
                </Card>

                {/* Withdrawal Form */}
                <Card className="bg-[#111827]/40 border-white/5 p-4 rounded-2xl">
                  <h4 className="text-xs font-bold text-white/90 mb-3 flex items-center gap-1 justify-end">
                    <ArrowUpRight className="h-4 w-4 text-[#10B981]" /> تقديم طلب سحب جديد
                  </h4>

                  <form onSubmit={handleWithdraw} className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setWithdrawNetwork('TRC20')}
                        className={`py-1.5 text-xs font-bold rounded-lg transition-all ${withdrawNetwork === 'TRC20' ? 'bg-[#10B981] text-white' : 'bg-black/30 text-white/50 border border-white/5'}`}
                      >
                        شبكة TRC20
                      </button>
                      <button
                        type="button"
                        onClick={() => setWithdrawNetwork('BEP20')}
                        className={`py-1.5 text-xs font-bold rounded-lg transition-all ${withdrawNetwork === 'BEP20' ? 'bg-[#10B981] text-white' : 'bg-black/30 text-white/50 border border-white/5'}`}
                      >
                        شبكة BEP20
                      </button>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-white/40 block text-right">عنوان المحفظة الشخصي</label>
                      <input
                        type="text"
                        placeholder="أدخل عنوان محفظة USDT الخاص بك"
                        value={withdrawWalletAddress}
                        onChange={(e) => setWithdrawWalletAddress(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-[#10B981] outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-white/40">
                        <span>الحد الأدنى للسحب: 0.20 USDT</span>
                        <span>متاح: ${userProfile.balance_usd.toFixed(2)}</span>
                      </div>
                      <input
                        type="number"
                        step="any"
                        placeholder="المبلغ بالدولار (USDT)"
                        value={withdrawAmountUsd}
                        onChange={(e) => setWithdrawAmountUsd(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-[#10B981] outline-none"
                      />
                    </div>

                    <Button type="submit" disabled={withdrawingInProgress} className="w-full bg-[#10B981] hover:bg-[#10B981]/90 text-white font-black py-2.5 rounded-xl text-xs border-none shadow-lg shadow-[#10B981]/5">
                      {withdrawingInProgress ? 'جاري المعالجة...' : 'تأكيد السحب الفوري'}
                    </Button>
                  </form>
                </Card>

                {/* Historical Transactions List */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-white/60 text-right">سجل العمليات والطلبات الأخيرة</h4>
                  
                  {withdrawals.length === 0 && userTxs.length === 0 ? (
                    <div className="text-center py-6 text-white/30 text-xs font-bold bg-[#111827]/20 border border-white/5 rounded-xl">
                      لا توجد عمليات مسجلة حالياً
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-52 overflow-y-auto scrollbar-hide">
                      {/* Show active withdrawals */}
                      {withdrawals.map((w, idx) => (
                        <div key={`with-${idx}`} className="bg-black/30 border border-white/5 p-3 rounded-xl flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-white/95">سحب عبر {w.network}</span>
                            <span className="text-[9px] text-white/40 block mt-0.5">{w.created_at?.slice(0, 16).replace('T', ' ')}</span>
                          </div>
                          <div className="text-left">
                            <span className="font-black text-[#FFD700] block">-${w.amount_usd || w.amountUsd} USDT</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full mt-0.5 inline-block ${w.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/10' : w.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' : 'bg-rose-500/10 text-rose-400 border border-rose-500/10'}`}>
                              {w.status === 'pending' ? 'قيد الانتظار' : w.status === 'completed' ? 'مكتمل' : 'مرفوض'}
                            </span>
                          </div>
                        </div>
                      ))}

                      {/* Show standard point transactions */}
                      {userTxs.map((t, idx) => (
                        <div key={`tx-${idx}`} className="bg-[#111827]/20 border border-white/5 p-3 rounded-xl flex items-center justify-between text-xs">
                          <div>
                            <span className="font-medium text-white/80">{t.description}</span>
                            <span className="text-[9px] text-white/40 block mt-0.5">{t.created_at?.slice(0, 16).replace('T', ' ')}</span>
                          </div>
                          <span className={`font-black ${t.amount_points > 0 ? 'text-[#10B981]' : 'text-rose-400'}`}>
                            {t.amount_points > 0 ? `+${t.amount_points}` : t.amount_points} ن
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        )}
      </div>

      {/* Floating Bottom Navigation Bar (Super Modern Glassmorphism) */}
      <div className="fixed bottom-4 left-4 right-4 h-20 bg-[#111827]/90 backdrop-blur-xl border border-white/10 rounded-[28px] shadow-2xl flex items-center justify-around px-2 z-45">
        
        <button
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center justify-center transition-all duration-300 gap-1 px-3 py-2 rounded-2xl ${activeTab === 'home' ? 'text-[#FFD700] scale-110 bg-[#FFD700]/5 font-black' : 'text-white/40 hover:text-white/70'}`}
        >
          <Home className="h-5 w-5" />
          <span className="text-[10px]">الرئيسية</span>
        </button>

        <button
          onClick={() => setActiveTab('ads')}
          className={`flex flex-col items-center justify-center transition-all duration-300 gap-1 px-3 py-2 rounded-2xl ${activeTab === 'ads' ? 'text-[#FFD700] scale-110 bg-[#FFD700]/5 font-black' : 'text-white/40 hover:text-white/70'}`}
        >
          <Megaphone className="h-5 w-5" />
          <span className="text-[10px]">إعلانات</span>
        </button>

        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex flex-col items-center justify-center transition-all duration-300 gap-1 px-3 py-2 rounded-2xl ${activeTab === 'tasks' ? 'text-[#FFD700] scale-110 bg-[#FFD700]/5 font-black' : 'text-white/40 hover:text-white/70'}`}
        >
          <CheckSquare className="h-5 w-5" />
          <span className="text-[10px]">مهام</span>
        </button>

        <button
          onClick={() => setActiveTab('referrals')}
          className={`flex flex-col items-center justify-center transition-all duration-300 gap-1 px-3 py-2 rounded-2xl ${activeTab === 'referrals' ? 'text-[#FFD700] scale-110 bg-[#FFD700]/5 font-black' : 'text-white/40 hover:text-white/70'}`}
        >
          <Users className="h-5 w-5" />
          <span className="text-[10px]">إحالات</span>
        </button>

        <button
          onClick={() => setActiveTab('wallet')}
          className={`flex flex-col items-center justify-center transition-all duration-300 gap-1 px-3 py-2 rounded-2xl ${activeTab === 'wallet' ? 'text-[#FFD700] scale-110 bg-[#FFD700]/5 font-black' : 'text-white/40 hover:text-white/70'}`}
        >
          <Wallet className="h-5 w-5" />
          <span className="text-[10px]">المحفظة</span>
        </button>

      </div>
    </div>
  )
}
