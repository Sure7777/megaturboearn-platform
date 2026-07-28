import React, { useState, useEffect, useCallback } from 'react'
import { Button, Badge, Card, CardContent, toast } from '@blinkdotnew/ui'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { useTonConnectUI, useTonWallet, useTonAddress } from '@tonconnect/ui-react'
import {
  Pickaxe,
  Zap,
  BatteryCharging,
  Cpu,
  Gift,
  KeyRound,
  Users,
  Wallet,
  Copy,
  Sparkles,
  Sun,
  Atom,
  Bot,
  ShieldCheck,
  Flame,
  Coins,
  Tv,
  CheckCircle2,
  Play,
  ExternalLink,
  PlusCircle,
  Share2,
  Send,
  Castle,
  Shield,
  Crosshair,
  Crown,
  Eye,
  Lock
} from 'lucide-react'
import { motion } from 'framer-motion'
import {
  tmaAPI,
  getCurrentUserId,
  getCurrentUserName,
  mockUser,
  getStoredUserProfile,
  saveStoredUserProfile,
  RIGS_CATALOG,
  type TMAUser,
  type TMATransaction,
  type TMARig,
  type TMAItem
} from '@/lib/tma-api'

const notify = (title: string, description?: string) => {
  try {
    toast(description ? `${title}: ${description}` : title)
  } catch {
    console.log(title, description)
  }
}

export function TMALayout() {
  const userId = getCurrentUserId()
  const userName = getCurrentUserName()
  const location = useLocation()
  const navigate = useNavigate()

  // State-based Tab System
  const [activeTab, setActiveTab] = useState<'citadel' | 'armies' | 'raids' | 'store' | 'wallet'>('citadel')

  // Army & Raids State
  const [armyData, setArmyData] = useState<{ inArmy: boolean; army?: any; userRank?: string; members?: any[]; activeRaids?: any[] }>({ inArmy: false })
  const [newArmyName, setNewArmyName] = useState('')
  const [joinArmyId, setJoinArmyId] = useState('')
  const [isCreatingArmy, setIsCreatingArmy] = useState(false)
  const [raidTargetInput, setRaidTargetInput] = useState('قلعة زعيم الظلال')

  // Fog Radar & Smartlink Modal State
  const [showFogRadarModal, setShowFogRadarModal] = useState(false)
  const [fogScanningTimer, setFogScanningTimer] = useState(5)
  const [fogDiscoveredLoot, setFogDiscoveredLoot] = useState<number | null>(null)

  // Morale & Victory Feast State
  const [moralePercent, setMoralePercent] = useState(100)
  const [showFeastModal, setShowFeastModal] = useState(false)

  // Load Army Data
  const loadArmyInfo = async () => {
    try {
      const res = await tmaAPI.getMyArmy(userId)
      if (res) setArmyData(res)
    } catch {}
  }

  useEffect(() => {
    loadArmyInfo()
  }, [userId])

  // Morale decay over time
  useEffect(() => {
    const interval = setInterval(() => {
      setMoralePercent((prev) => Math.max(10, prev - 1))
    }, 180000) // drops 1% every 3 mins
    return () => clearInterval(interval)
  }, [])

  // Fog Radar Scan Launcher (Simulates 5s Smartlink Fog Scanning)
  const handleScanFogRadar = () => {
    setShowFogRadarModal(true)
    setFogScanningTimer(5)
    setFogDiscoveredLoot(null)

    const interval = setInterval(() => {
      setFogScanningTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          const loot = Math.floor(1000 + Math.random() * 4000)
          setFogDiscoveredLoot(loot)
          setUserProfile((p) => ({
            ...p,
            balance_points: p.balance_points + loot,
            ad_views_count: (p.ad_views_count || 0) + 1
          }))
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // Restore Morale via Victory Feast Video Ad
  const handleVictoryFeast = async () => {
    startWatchingAd('morale-feast', 'مأدبة النصر لإعادة روح القتال', 500, 5)
    setTimeout(() => {
      setMoralePercent(100)
      tmaAPI.restoreMorale(userId)
      notify('🍗 مأدبة النصر!', 'تم استعادة المعنويات بنجاح إلى 100% وتحسين إنتاجية القلعة!')
      setShowFeastModal(false)
    }, 5500)
  }

  // Create Army Handler
  const handleCreateArmy = async () => {
    if (!newArmyName.trim()) {
      notify('تنبيه', 'يرجى كتابة اسم الجيش.')
      return
    }
    setIsCreatingArmy(true)
    try {
      const res = await tmaAPI.createArmy(userId, newArmyName.trim())
      if (res && res.success) {
        notify('🎉 تم التأسيس!', res.message || 'تم إنشاء الجيش بنجاح!')
        setNewArmyName('')
        loadArmyInfo()
      } else {
        notify('خطأ', res?.error || 'حدث خطأ أثناء تأسيس الجيش')
      }
    } finally {
      setIsCreatingArmy(false)
    }
  }

  // Join Army Handler
  const handleJoinArmy = async () => {
    if (!joinArmyId.trim()) {
      notify('تنبيه', 'أدخل رمز الجيش للانضمام.')
      return
    }
    const res = await tmaAPI.joinArmy(userId, joinArmyId.trim())
    if (res && res.success) {
      notify('⚔️ انضمام ناجح!', res.message || 'انضممت إلى الجيش بنجاح!')
      setJoinArmyId('')
      loadArmyInfo()
    } else {
      notify('خطأ', res?.error || 'تعذر الانضمام للجيش')
    }
  }

  // Create Raid
  const handleCreateRaid = async () => {
    if (!armyData.army?.id) {
      notify('تنبيه', 'يجب أن تكون في جيش لتنظيم غزوة.')
      return
    }
    const res = await tmaAPI.createRaid(userId, armyData.army.id, raidTargetInput)
    if (res && res.success) {
      notify('💥 غزوة جديدة!', res.message || 'تم فتح الغزوة!')
      loadArmyInfo()
    } else {
      notify('خطأ', res?.error || 'تعذر تنظيم الغزوة')
    }
  }

  // Join Raid
  const handleJoinRaid = async (raidId: string) => {
    const res = await tmaAPI.joinRaid(userId, raidId)
    if (res && res.success) {
      notify('⚔️ تم الانضمام للغزوة', res.message || 'تم إكمال الهجوم!')
      loadArmyInfo()
      loadUserData()
    } else {
      notify('تنبيه', res?.error || 'تعذر الانضمام للغزوة')
    }
  }

  // Synchronize URL route with activeTab
  useEffect(() => {
    const path = location.pathname
    if (path.includes('/armies')) setActiveTab('armies')
    else if (path.includes('/raids')) setActiveTab('raids')
    else if (path.includes('/store')) setActiveTab('store')
    else if (path.includes('/wallet')) setActiveTab('wallet')
    else if (path.includes('/app')) setActiveTab('citadel')
  }, [location.pathname])

  const handleTabChange = (tab: 'citadel' | 'armies' | 'raids' | 'store' | 'wallet') => {
    setActiveTab(tab)
    const routesMap: Record<string, string> = {
      citadel: '/app',
      armies: '/app/armies',
      raids: '/app/raids',
      store: '/app/store',
      wallet: '/app/wallet',
    }
    try { navigate({ to: routesMap[tab] || '/app' }) } catch {}
  }

  // Ad Watching Modal State
  const [activeAd, setActiveAd] = useState<{ id: string; name: string; points: number; durationSec: number; url?: string } | null>(null)
  const [adTimer, setAdTimer] = useState<number>(0)
  const [tasksList, setTasksList] = useState<TMAItem[]>([])

  // Paid Task Creation Modal State
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false)
  const [newPaidTaskTitle, setNewPaidTaskTitle] = useState('')
  const [newPaidTaskUrl, setNewPaidTaskUrl] = useState('')
  const [newPaidTaskReward, setNewPaidTaskReward] = useState('500')
  const [newPaidTaskTarget, setNewPaidTaskTarget] = useState('100')
  const [newPaidTaskTxId, setNewPaidTaskTxId] = useState('')

  // Read configured paid tasks deposit wallet address
  const [paidTasksWallet] = useState(() => {
    if (typeof window === 'undefined') return { address: 'EQD__________________________________________', network: 'TON' }
    return {
      address: localStorage.getItem('admin_paid_tasks_wallet') || 'EQD__________________________________________',
      network: 'TON'
    }
  })

  // TON Connect UI & Wallet Hooks
  const [tonConnectUI] = useTonConnectUI()
  const wallet = useTonWallet()
  const userFriendlyAddress = useTonAddress()

  // TON Wallet State
  const [tonWalletAddress, setTonWalletAddress] = useState(() => {
    if (typeof window === 'undefined') return ''
    return localStorage.getItem('ton_wallet_address') || ''
  })

  // Sync TON Connect wallet with app state
  useEffect(() => {
    if (userFriendlyAddress) {
      setTonWalletAddress(userFriendlyAddress)
      localStorage.setItem('ton_wallet_address', userFriendlyAddress)
      setWithdrawWalletAddress(userFriendlyAddress)

      const taskDoneKey = `task_ton_wallet_done_${userId}`
      if (!localStorage.getItem(taskDoneKey)) {
        localStorage.setItem(taskDoneKey, 'true')
        setUserProfile((prev) => ({
          ...prev,
          balance_points: prev.balance_points + 1000,
          balance_usd: (prev.balance_points + 1000) / 100000
        }))
        notify('🎉 تم ربط محفظة TON بنجاح عبر TON Connect!', 'تم حفظ العنوان واكتساب +1,000 نقطة مكافأة!')
      }
    }
  }, [userFriendlyAddress, userId])

  // Core User Profile & Mining State - Persisted to localStorage (Loaded after mount to prevent SSR hydration mismatch)
  const [userProfile, setUserProfile] = useState<TMAUser>(mockUser)
  const [isLoadedFromStorage, setIsLoadedFromStorage] = useState(false)

  // Load from localStorage on client mount
  useEffect(() => {
    const stored = getStoredUserProfile(userId)
    if (stored) {
      setUserProfile(stored)
    }
    setIsLoadedFromStorage(true)
  }, [userId])

  // Persist userProfile changes to localStorage after initial mount
  useEffect(() => {
    if (isLoadedFromStorage) {
      saveStoredUserProfile(userId, userProfile)
    }
  }, [userProfile, userId, isLoadedFromStorage])

  const [, setUserTxs] = useState<TMATransaction[]>([])
  const [withdrawals, setWithdrawals] = useState<any[]>([])
  const [referralStats, setReferralStats] = useState({ level1Count: 0, level2Count: 0, totalEarnings: 0 })

  // Energy & Tap State
  const [energy, setEnergy] = useState<number>(1000)
  const [maxEnergy] = useState<number>(1000)
  const [tapParticles, setTapParticles] = useState<Array<{ id: number; x: number; y: number }>>([])
  const [isTapping, setIsTapping] = useState(false)

  // Battery Timer State
  const [batteryCountdown, setBatteryCountdown] = useState<string>('01:00:00')
  const [batteryPercent, setBatteryPercent] = useState<number>(100)
  const [isBatteryActive, setIsBatteryActive] = useState<boolean>(true)

  // Promo Code & Daily Cipher Inputs
  const [promoInput, setPromoInput] = useState('')
  const [isClaimingPromo, setIsClaimingPromo] = useState(false)
  const [cipherInput, setCipherInput] = useState('')
  const [isClaimingCipher, setIsClaimingCipher] = useState(false)

  // Wallet Inputs
  const [convertPointsInput, setConvertPointsInput] = useState('')
  const [withdrawAmountUsd, setWithdrawAmountUsd] = useState('0.20')
  const [withdrawNetwork, setWithdrawNetwork] = useState<'TON'>('TON')
  const [withdrawWalletAddress, setWithdrawWalletAddress] = useState('')
  const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = useState(false)

  // Energy regeneration interval
  useEffect(() => {
    const timer = setInterval(() => {
      setEnergy((prev) => Math.min(maxEnergy, prev + 2))
    }, 2000)
    return () => clearInterval(timer)
  }, [maxEnergy])

  // Battery expiry countdown timer
  useEffect(() => {
    const updateBatteryStatus = () => {
      if (!userProfile.battery_expires_at) {
        setBatteryCountdown('01:00:00')
        setBatteryPercent(100)
        setIsBatteryActive(true)
        return
      }

      const expiresMs = new Date(userProfile.battery_expires_at).getTime()
      const nowMs = Date.now()
      const diffMs = expiresMs - nowMs

      if (diffMs <= 0) {
        setBatteryCountdown('🛑 متوقفة (انتهت البطارية)')
        setBatteryPercent(0)
        setIsBatteryActive(false)
      } else {
        setIsBatteryActive(true)
        const hours = Math.floor(diffMs / (1000 * 3600))
        const mins = Math.floor((diffMs % (1000 * 3600)) / (1000 * 60))
        const secs = Math.floor((diffMs % (1000 * 60)) / 1000)
        setBatteryCountdown(`${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`)
        
        // Max battery duration = 1 hour
        const pct = Math.min(100, Math.max(0, (diffMs / (1 * 3600 * 1000)) * 100))
        setBatteryPercent(Math.round(pct))
      }
    }

    updateBatteryStatus()
    const interval = setInterval(updateBatteryStatus, 1000)
    return () => clearInterval(interval)
  }, [userProfile.battery_expires_at])

  // Real-time passive earnings accumulation interval based on PPH
  useEffect(() => {
    if (!isBatteryActive) return
    const interval = setInterval(() => {
      setUserProfile((prev) => {
        const pph = prev.mining_pph || 100
        const addedPerSec = pph / 3600
        const currentPending = prev.pending_passive_points || 0
        return {
          ...prev,
          pending_passive_points: Math.floor(currentPending + addedPerSec)
        }
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [isBatteryActive])

  // Fetch User Data & Mining State
  const loadUserData = useCallback(async () => {
    try {
      const user = await tmaAPI.getUser(userId)
      if (user && typeof user.balance_points === 'number') {
        setUserProfile((prev) => {
          const stored = getStoredUserProfile(userId)
          // Keep the highest recorded balance points to prevent unintended resets
          const maxPoints = Math.max(user.balance_points, stored.balance_points || 0, prev.balance_points || 0)
          const merged = { ...prev, ...user, balance_points: maxPoints }
          saveStoredUserProfile(userId, merged)
          return merged
        })
      }

      const txs = await tmaAPI.getTransactions(userId)
      if (txs) setUserTxs(txs)

      const wHistory = await tmaAPI.getWithdrawals(userId)
      if (wHistory) setWithdrawals(wHistory)

      const refInfo = await tmaAPI.getReferrals(userId)
      if (refInfo) setReferralStats(refInfo)

      const items = await tmaAPI.getItems('task')
      if (items) setTasksList(items)
    } catch {
      // Do not reset to mockUser on network or sandbox error
    }
  }, [userId])

  useEffect(() => {
    loadUserData()
  }, [loadUserData])

  // Ad timer countdown effect
  useEffect(() => {
    if (!activeAd || adTimer <= 0) return
    const interval = setInterval(() => {
      setAdTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          // Ad completed!
          if (activeAd.id === 'battery-recharge') {
            tmaAPI.rechargeBattery(userId).then(() => {
              const newExp = new Date(Date.now() + 1 * 3600 * 1000).toISOString()
              setUserProfile((p) => ({
                ...p,
                battery_expires_at: newExp,
                recharge_count: (p.recharge_count || 0) + 1,
                ad_views_count: (p.ad_views_count || 0) + 1,
                balance_points: Math.max(0, p.balance_points - 500),
                balance_usd: Math.max(0, p.balance_points - 500) / 100000,
                battery_active: true
              }))
              notify('⚡ تم شحن البطارية لـ ساعة واحدة!', 'تمت مشاهدة الإعلان وخصم 500 نقطة بنجاح.')
              setActiveAd(null)
              loadUserData()
            })
          } else {
            tmaAPI.completeItem(userId, activeAd.id, 'short').then(() => {
              notify('🎉 مكتمل بنجاح!', `تمت مشاهدة الإعلان واكتساب +${activeAd.points} نقطة!`)
              setUserProfile((p) => ({
                ...p,
                balance_points: p.balance_points + activeAd.points,
                balance_usd: (p.balance_points + activeAd.points) / 100000,
                ad_views_count: (p.ad_views_count || 0) + 1
              }))
              setActiveAd(null)
              loadUserData()
            })
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [activeAd, adTimer, userId, loadUserData])

  const startWatchingAd = (id: string, name: string, points: number, durationSec: number = 5, url?: string) => {
    if (url) {
      try { window.open(url, '_blank') } catch {}
    }
    setActiveAd({ id, name, points, durationSec, url })
    setAdTimer(durationSec)
  }

  // Handle Tap Mining Click
  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (energy < 1) {
      notify('الطاقة منخفضة!', 'انتظر تجدد شريط الطاقة أو قم بتطوير المناجم.')
      return
    }

    setEnergy((prev) => Math.max(0, prev - 1))
    setIsTapping(true)
    setTimeout(() => setIsTapping(false), 150)

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const newParticle = { id: Date.now() + Math.random(), x, y }

    setTapParticles((prev) => [...prev.slice(-10), newParticle])

    // Update local UI state
    setUserProfile((prev) => ({
      ...prev,
      balance_points: prev.balance_points + 1,
      balance_usd: (prev.balance_points + 1) / 100000,
      tap_count: (prev.tap_count || 0) + 1
    }))

    // Persist tap
    tmaAPI.tapMining(userId, 1)
  }

  // Recharge Battery Action (Requires Ad + Deducts 500 points)
  const handleRechargeBattery = async () => {
    if (userProfile.balance_points < 500) {
      notify('رصيد غير كافٍ لشحن البطارية', 'يلزم وجود 500 نقطة في حسابك بالإضافة لمشاهدة الإعلان لشحن البطارية.')
      return
    }
    startWatchingAd('battery-recharge', 'شحن بطارية المولد (ساعة واحدة)', -500, 5)
  }

  // Connect TON Wallet Action via TON Connect UI
  const handleConnectTonWallet = () => {
    if (wallet) {
      tonConnectUI.disconnect()
      setTonWalletAddress('')
      localStorage.removeItem('ton_wallet_address')
      notify('تم قطع الاتصال بالمحفظة', 'يمكنك إعادة الربط عبر TON Connect في أي وقت.')
    } else {
      tonConnectUI.openModal()
    }
  }

  // Share Referral Link on Telegram
  const handleShareOnTelegram = () => {
    const refLink = `https://t.me/MegaTurboEarnBot?start=ref_${userId}`
    const text = `🚀 انضم إلي في منصة MegaTurboEarn واكسب المكافآت والذهب مجاناً من التعدين والمهام!`
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent(text)}`
    try {
      if ((window as any).Telegram?.WebApp?.openTelegramLink) {
        (window as any).Telegram.WebApp.openTelegramLink(shareUrl)
      } else {
        window.open(shareUrl, '_blank')
      }
    } catch {
      window.open(shareUrl, '_blank')
    }
  }

  // Handle User Pay & Create Paid Task via TON Connect
  const handlePayAndCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPaidTaskTitle.trim() || !newPaidTaskUrl.trim()) {
      notify('بيانات غير مكتملة', 'يرجى إدخال عنوان المهمة ورابط القناة أو التكليف.')
      return
    }

    const targetNum = parseInt(newPaidTaskTarget) || 100
    const rewardNum = parseInt(newPaidTaskReward) || 500
    const costUsd = targetNum * 0.01 // $0.01 per execution ($10 per 1,000)
    const nanotons = Math.floor((costUsd / 5.0) * 1_000_000_000)

    if (!wallet) {
      notify('ربط المحفظة مطلوب', 'يرجى ربط محفظة TON أولاً لإتمام معاملة إيداع التمويل تلقائياً.')
      tonConnectUI.openModal()
      return
    }

    try {
      const tx = {
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [
          {
            address: paidTasksWallet.address,
            amount: nanotons.toString(),
          }
        ]
      }

      notify('⏳ جاري تأكيد معاملة الإيداع...', 'يرجى فتح تطبيق المحفظة للموافقة على تحويل رسوم الإيداع.')
      await tonConnectUI.sendTransaction(tx)

      const res = await tmaAPI.createPaidTask({
        userId,
        title: newPaidTaskTitle.trim(),
        url: newPaidTaskUrl.trim(),
        rewardPoints: rewardNum,
        targetCompletions: targetNum,
        depositAmountUsd: costUsd
      })

      if (res && res.success) {
        notify('🎉 تم الإيداع وتفعيل المهمة بنجاح!', res.message)
      } else {
        notify('🎉 تم نشر قناتك وتفعيل المهمة!', `تم خصم رسوم الإيداع ($${costUsd.toFixed(2)}) وتفعيل قناتك للمستخدمين فوراً!`)
      }

      setShowCreateTaskModal(false)
      setNewPaidTaskTitle('')
      setNewPaidTaskUrl('')
      loadUserData()
    } catch (err: any) {
      notify('فشلت عملية الإيداع أو ألغيت', err?.message || 'لم يتم تأكيد الدفع في المحفظة.')
    }
  }

  // Claim Passive Mining Earnings
  const handleClaimPassive = async () => {
    const pending = userProfile.pending_passive_points || 0
    if (pending <= 0) {
      notify('لا يوجد أرباح متراكمة حالياً', 'انتظر قليلاً لتراكم أرباح التعدين الساعية أثناء عمل المولد.')
      return
    }

    const res = await tmaAPI.claimPassiveEarnings(userId)
    if (res && res.success) {
      notify('📥 تم الجمع بنجاح!', res.message)
      setUserProfile((prev) => ({
        ...prev,
        pending_passive_points: 0
      }))
      loadUserData()
    } else {
      setUserProfile((prev) => ({
        ...prev,
        balance_points: prev.balance_points + pending,
        balance_usd: (prev.balance_points + pending) / 100000,
        pending_passive_points: 0,
        last_passive_claim_at: new Date().toISOString()
      }))
      notify('📥 تم استلام أرباح التعدين السلبي!', `تمت إضافة +${pending.toLocaleString()} نقطة إلى رصيدك الرئيسي!`)
    }
  }

  // Buy/Upgrade Rig
  const handleBuyRig = async (rig: TMARig) => {
    if (userProfile.balance_points < rig.cost) {
      notify('رصيد غير كافٍ', `تحتاج ${rig.cost.toLocaleString()} نقطة لتطوير هذا المنجم.`)
      return
    }

    const res = await tmaAPI.buyRig(userId, rig.id)
    if (res && res.success) {
      notify('🚀 تم التطوير بنجاح!', res.message)
      loadUserData()
    } else if (res && res.error) {
      notify('فشل التطوير', res.error)
    } else {
      // Fallback
      setUserProfile((prev) => ({
        ...prev,
        balance_points: prev.balance_points - rig.cost,
        mining_pph: (prev.mining_pph || 100) + rig.pphBoost,
        rigs: [...(prev.rigs || []), { rig_id: rig.id, level: 1 }]
      }))
      notify('🚀 تم تطوير المنجم!', `تمت زيادة أرباحك بمقدار +${rig.pphBoost}/ساعة!`)
    }
  }

  // Claim Promo Code
  const handleClaimPromoCode = async () => {
    if (!promoInput.trim()) return
    setIsClaimingPromo(true)
    try {
      const res = await tmaAPI.claimPromoCode(userId, promoInput.trim())
      if (res && res.success) {
        notify('🎁 تم استبدال الكود بنجاح!', res.message || `حصلت على +${res.points} نقطة!`)
        setPromoInput('')
        loadUserData()
      } else {
        notify('كود غير صحيح أو منتهي', res?.error || 'تاكد من الكود وحاول مجدداً.')
      }
    } finally {
      setIsClaimingPromo(false)
    }
  }

  // Claim Daily Cipher
  const handleClaimDailyCipher = async () => {
    if (!cipherInput.trim()) return
    setIsClaimingCipher(true)
    try {
      const res = await tmaAPI.claimDailyCipher(userId, cipherInput.trim())
      if (res && res.success) {
        notify('🧠 تم فك اللغز بنجاح!', res.message)
        setCipherInput('')
        loadUserData()
      } else {
        notify('كلمة سر غير صحيحة', res?.error || 'حاول مجدداً!')
      }
    } finally {
      setIsClaimingCipher(false)
    }
  }

  // Claim Daily Combo
  const handleClaimDailyCombo = async () => {
    const res = await tmaAPI.claimDailyCombo(userId)
    if (res && res.success) {
      notify('🎉 مكافأة الكومبو اليومي!', res.message)
      loadUserData()
    } else {
      notify('شرط الكومبو', res?.error || 'قم بتطوير 3 مناجم/كروت على الأقل لفتح مكافأة الكومبو اليومي!')
    }
  }

  // Send Energy Pulse (Deducts 50 points)
  const handleSendPulse = async (targetId?: string) => {
    if (userProfile.balance_points < 50) {
      notify('رصيد غير كافٍ', 'يلزم وجود 50 نقطة لإرسال نبضة طاقة صديق.')
      return
    }
    const res = await tmaAPI.sendPulse(userId, targetId || '')
    if (res && res.success) {
      setUserProfile((prev) => ({ ...prev, balance_points: Math.max(0, prev.balance_points - 50) }))
      notify('⚡ تم إرسال نبضة الطاقة!', res.message)
      loadUserData()
    } else {
      setUserProfile((prev) => ({ ...prev, balance_points: Math.max(0, prev.balance_points - 50) }))
      notify('⚡ تم إرسال نبضة الطاقة!', 'تم تنبيه صديقك لتشغيل التعدين وخصم 50 نقطة.')
    }
  }

  // Mass Broadcast to Referral Team
  const handleMassBroadcast = async () => {
    const totalRefs = (referralStats.level1Count || 0) + (referralStats.level2Count || 0)
    if (totalRefs <= 0) {
      notify('لا توجد إحالات بعد', 'قم بدعوة الأصدقاء أولاً لتتمكن من إرسال تنبيهات جماعية لفريقك!')
      return
    }
    const cost = Math.max(1, Math.ceil(totalRefs / 50)) * 5000
    if (userProfile.balance_points < cost) {
      notify('رصيد غير كافٍ', `يلزم وجود ${cost.toLocaleString()} نقطة لإرسال تذكير جماعي لفريقك (${totalRefs} عضو).`)
      return
    }

    const res = await tmaAPI.massBroadcast(userId, cost)
    if (res && res.success) {
      setUserProfile((prev) => ({ ...prev, balance_points: Math.max(0, prev.balance_points - cost) }))
      notify('📢 تم إرسال التنبيه الجماعي!', res.message)
      loadUserData()
    } else {
      setUserProfile((prev) => ({ ...prev, balance_points: Math.max(0, prev.balance_points - cost) }))
      notify('📢 تم إرسال التنبيه الجماعي!', `تم تنبيه فريقك (${totalRefs} عضو) لتنشيط المولد والتعدين!`)
    }
  }

  // Convert Points to USD
  const handleConvertPoints = async () => {
    const pts = parseInt(convertPointsInput, 10)
    if (isNaN(pts) || pts <= 0) {
      notify('عدد غير صحيح', 'أدخل قيمة نقاط صحيحة للتحويل.')
      return
    }
    if (pts > userProfile.balance_points) {
      notify('رصيد غير كافٍ', 'ليس لديك هذا القدر من النقاط.')
      return
    }

    const res = await tmaAPI.convertPoints(userId, pts)
    if (res && res.success) {
      notify('💵 تم تحويل النقاط بنجاح!', `تم إضافة +$${res.usd.toFixed(4)} لرصيدك!`)
      setConvertPointsInput('')
      loadUserData()
    } else {
      const usdAdded = pts / 100000
      setUserProfile((prev) => ({
        ...prev,
        balance_points: prev.balance_points - pts,
        balance_usd: prev.balance_usd + usdAdded
      }))
      notify('💵 تم تحويل النقاط بنجاح!', `تم تحويل ${pts.toLocaleString()} نقطة إلى $${usdAdded.toFixed(4)} USDT`)
      setConvertPointsInput('')
    }
  }

  // Request Withdrawal (Requires $0.20 min and 3 active referrals)
  const handleRequestWithdrawal = async () => {
    const amt = parseFloat(withdrawAmountUsd)
    if (isNaN(amt) || amt <= 0 || amt < 0.20) {
      notify('الحد الأدنى للسحب هو $0.20', 'يرجى كتابة مبلغ سحب $0.20 أو أكثر.')
      return
    }
    const currentActiveRefs = referralStats.level1Count || userProfile.active_referrals_count || 0
    if (currentActiveRefs < 3) {
      notify('🔒 السحب مقفل', `يجب إكمال 3 إحالات نشطة على الأقل لفتح ميزة السحب. لديك حالياً: (${currentActiveRefs}/3) إحالة.`)
      return
    }
    if (!withdrawWalletAddress.trim()) {
      notify('عنوان المحفظة مطلوب', 'أدخل عنوان محفظة TON الخاص بك.')
      return
    }

    setIsSubmittingWithdrawal(true)
    try {
      const res = await tmaAPI.requestWithdrawal(userId, amt, withdrawNetwork, withdrawWalletAddress.trim())
      if (res && res.success) {
        notify('✅ تم تقديم طلب السحب بنجاح!', res.message || 'طلبك بحالة قيد المراجعة (Pending) وفي انتظار الموافقة اليدوية من الأدمن.')
        setWithdrawWalletAddress('')
        loadUserData()
      } else {
        notify('🔴 لم يتم إرسال الطلب', res?.error || 'تأكد من استيفاء شروط السحب.')
      }
    } finally {
      setIsSubmittingWithdrawal(false)
    }
  }

  // Copy Referral Link
  const copyReferralLink = () => {
    const link = `https://t.me/MegaTurboEarnBot?start=ref_${userId}`
    navigator.clipboard.writeText(link)
    notify('📋 تم نسخ رابط الإحالة!', 'شاركه مع أصدقائك لفتح السحب واكتساب العمولات.')
  }

  const activeRefsCount = userProfile.active_referrals_count || referralStats.level1Count || 0
  const rechargesCount = userProfile.recharge_count || 0

  return (
    <div className="min-h-screen bg-[#0d0d0f] text-slate-100 font-['Cairo'] dir-rtl select-none pb-24">
      {/* ── TOP HEADER / BALANCE & MORALE HUD ───────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[#111114]/90 backdrop-blur-md border-b border-[#FFD700]/20 px-4 py-3">
        <div className="max-w-md mx-auto space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFD700] to-amber-600 p-0.5 shadow-lg shadow-[#FFD700]/10">
                <div className="w-full h-full bg-[#0d0d0f] rounded-[10px] flex items-center justify-center">
                  <Pickaxe className="w-5 h-5 text-[#FFD700] animate-pulse" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="font-bold text-sm tracking-wide text-white">{userName}</h1>
                  <Badge variant="outline" className="text-[10px] bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/30 px-1.5 py-0">
                    {armyData.userRank || userProfile.level}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                  <span className="flex items-center gap-1 text-amber-400 font-medium">
                    <Zap className="w-3 h-3 text-[#FFD700]" />
                    +{(userProfile.mining_pph || 100).toLocaleString()}/ساعة
                  </span>
                </div>
              </div>
            </div>

            <div className="text-left">
              <div className="text-xs text-slate-400 font-medium">خزينة الذهب</div>
              <div className="text-base font-extrabold text-[#FFD700] font-['Syne'] tracking-wide flex items-center justify-end gap-1">
                <span>{userProfile.balance_points.toLocaleString()}</span>
                <span className="text-[10px] text-amber-500 font-normal">ذهب</span>
              </div>
              <div className="text-[11px] text-emerald-400 font-mono text-left font-bold">
                ${(userProfile.balance_usd || userProfile.balance_points / 100000).toFixed(4)} USDT
              </div>
            </div>
          </div>

          {/* Morale Bar Gauge */}
          <div
            onClick={() => setShowFeastModal(true)}
            className="bg-[#0d0d0f] rounded-lg p-2 border border-[#FFD700]/20 flex items-center justify-between gap-3 cursor-pointer hover:border-[#FFD700]/40 transition-colors"
          >
            <div className="flex items-center gap-1.5 text-xs text-amber-300 font-bold">
              <Flame className="w-4 h-4 text-amber-400 animate-bounce" />
              <span>معنويات الجيش:</span>
            </div>
            <div className="flex-1 space-y-0.5">
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-white/5">
                <div
                  className={`h-full transition-all duration-500 ${
                    moralePercent > 50
                      ? 'bg-gradient-to-r from-emerald-500 to-[#FFD700]'
                      : moralePercent > 20
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${moralePercent}%` }}
                />
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-[#FFD700]">{moralePercent}%</span>
            <Button size="sm" className="bg-[#FFD700] text-black text-[10px] font-extrabold h-6 px-2">
              🍗 مأدبة
            </Button>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT CONTAINER ──────────────────────────────────────── */}
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {/* 🏰 TAB 1: CITADEL DASHBOARD (3D Isometric Sci-Fi Strategy) */}
        {activeTab === 'citadel' && (
          <div className="space-y-4 animate-in fade-in duration-300">

            {/* 3D Citadel Stronghold Banner */}
            <Card className="bg-gradient-to-b from-[#1c1c24] via-[#121216] to-[#0a0a0c] border-2 border-[#FFD700]/40 text-white shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-amber-500 via-[#FFD700] to-amber-600" />
              
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-[#FFD700]/10 border border-[#FFD700]/30 flex items-center justify-center text-[#FFD700] shadow-inner">
                      <Castle className="w-6 h-6 text-[#FFD700] animate-pulse" />
                    </div>
                    <div>
                      <h2 className="text-xs font-black text-[#FFD700] font-['Cairo'] flex items-center gap-1.5">
                        القلعة المركزية (Level {userProfile.level || 'Bronze'})
                      </h2>
                      <p className="text-[10px] text-slate-400">مقر قيادة العمليات والتعدين الإقليمي المظلم</p>
                    </div>
                  </div>
                  <Badge className="bg-[#FFD700]/20 text-[#FFD700] border-[#FFD700]/40 font-mono text-[10px]">
                    3D Isometric
                  </Badge>
                </div>

                {/* Battery Energy Generator Progress */}
                <div className="bg-[#0d0d0f] rounded-xl p-3 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <div className="flex items-center gap-1.5 text-slate-200">
                      <BatteryCharging className={`w-4 h-4 ${isBatteryActive ? 'text-emerald-400 animate-pulse' : 'text-red-400'}`} />
                      <span>مولد الطاقة المظلمة (4 ساعات)</span>
                    </div>
                    <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${isBatteryActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                      {batteryCountdown}
                    </Badge>
                  </div>

                  <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-white/5">
                    <div
                      className={`h-full transition-all duration-500 ${isBatteryActive ? 'bg-gradient-to-r from-amber-500 to-[#FFD700]' : 'bg-red-500'}`}
                      style={{ width: `${batteryPercent}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-400">
                    <span>معدل الإنتاج الآلي: <strong className="text-[#FFD700]">+{userProfile.mining_pph || 100} ذهبة/ساعة</strong></span>
                    <Button
                      onClick={handleRechargeBattery}
                      size="sm"
                      className="bg-[#FFD700] hover:bg-amber-400 text-black text-[10px] font-extrabold h-6 px-2.5"
                    >
                      ⚡ شحن بالطاقة (إعلان)
                    </Button>
                  </div>
                </div>

                {/* Tap Core Isometric Clicker */}
                <div className="pt-2 text-center relative space-y-3">
                  <div
                    onClick={handleTap}
                    className="w-32 h-32 mx-auto rounded-3xl bg-gradient-to-br from-amber-500/20 via-[#FFD700]/10 to-amber-900/30 border-4 border-[#FFD700]/60 flex items-center justify-center cursor-pointer shadow-[0_0_40px_rgba(255,215,0,0.2)] active:scale-95 transition-transform relative group overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-[#FFD700]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Coins className="w-16 h-16 text-[#FFD700] drop-shadow-[0_0_15px_rgba(255,215,0,0.8)] animate-bounce" />
                    
                    {/* Visual Tap Indicator */}
                    <div className="absolute bottom-2 text-[9px] font-black text-[#FFD700] bg-black/60 px-2 py-0.5 rounded-full border border-[#FFD700]/30">
                      اضغط للتعدين (+1)
                    </div>
                  </div>

                  <div className="flex justify-between items-center bg-[#0d0d0f] rounded-xl p-2.5 border border-white/5 text-xs font-bold">
                    <span className="text-slate-400">الطاقة القتالية:</span>
                    <span className="text-[#FFD700] font-mono">{energy} / {maxEnergy} ⚡</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Fog Radar Regional Scanner Trigger */}
            <Card className="bg-gradient-to-r from-purple-950/60 via-[#161618] to-purple-950/60 border-2 border-purple-500/50 text-white p-3.5 flex items-center justify-between gap-3 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300">
                  <Eye className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-purple-300 font-['Cairo']">رادار الضباب الإقليمي (Fog Radar)</h3>
                  <p className="text-[10px] text-slate-300 mt-0.5">افحص الضباب لاكتشاف غنائم الحرب والذهب الضائع!</p>
                </div>
              </div>
              <Button
                onClick={handleScanFogRadar}
                disabled={fogScanningTimer > 0 && fogScanningTimer < 5}
                className="bg-purple-500 hover:bg-purple-400 text-black font-extrabold text-xs h-9 px-3 shrink-0"
              >
                {fogScanningTimer > 0 && fogScanningTimer < 5 ? 'جاري المسح...' : '🔍 كشف الضباب'}
              </Button>
            </Card>

            {/* Daily Combo & Cipher Quick Section */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-[#161618] border border-[#FFD700]/20 text-white p-3 space-y-2">
                <div className="text-[11px] font-extrabold text-[#FFD700] flex items-center gap-1">
                  <Gift className="w-3.5 h-3.5 text-[#FFD700]" />
                  الكومبو اليومي
                </div>
                <p className="text-[10px] text-slate-400">طوّر 3 مناجم للحصول على المكافأة الكبرى</p>
                <Button
                  onClick={handleClaimDailyCombo}
                  size="sm"
                  className="w-full bg-[#FFD700] text-black font-bold text-[10px] h-7"
                >
                  🎁 استلام +10,000
                </Button>
              </Card>

              <Card className="bg-[#161618] border border-[#FFD700]/20 text-white p-3 space-y-2">
                <div className="text-[11px] font-extrabold text-[#FFD700] flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#FFD700]" />
                  شفرة النصر
                </div>
                <input
                  type="text"
                  value={cipherInput}
                  onChange={(e) => setCipherInput(e.target.value)}
                  placeholder="الكلمة السرية"
                  className="w-full bg-[#0d0d0f] border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white uppercase focus:border-[#FFD700] outline-none"
                />
                <Button
                  onClick={handleClaimDailyCipher}
                  size="sm"
                  className="w-full bg-amber-500 text-black font-bold text-[10px] h-7"
                >
                  فك اللغز
                </Button>
              </Card>
            </div>
          </div>
        )}

        {/* 🛡️ TAB 2: REGIONAL ARMIES & VIRAL HIERARCHY */}
        {activeTab === 'armies' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* Army Status Card */}
            <Card className="bg-gradient-to-r from-amber-950/60 via-[#161618] to-amber-950/60 border-2 border-[#FFD700]/50 text-white p-4 space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#FFD700]/20 border border-[#FFD700]/40 flex items-center justify-center text-[#FFD700] shrink-0">
                    <Shield className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-[#FFD700] font-['Cairo'] flex items-center gap-2">
                      جيش القائد: {armyData?.army?.name || `جيش ${userName}`}
                    </h3>
                    <div className="text-[10px] text-slate-300 mt-0.5 flex items-center gap-2">
                      <span>الرتبة: <strong className="text-amber-400">{armyData?.userRank || 'General'}</strong></span>
                      <span>•</span>
                      <span>كود التجنيد: <strong className="text-[#FFD700] font-mono">{armyData?.army?.id || userId}</strong></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Army Power Stats */}
              <div className="grid grid-cols-3 gap-2 bg-[#0d0d0f] p-2.5 rounded-xl border border-white/10 text-center font-['Cairo']">
                <div>
                  <span className="text-[9px] text-slate-400 block">جنود الصف الأول</span>
                  <strong className="text-xs text-white font-mono">{referralStats.level1Count || 0}</strong>
                </div>
                <div>
                  <span className="text-[9px] text-[#FFD700] block">إجمالي قوة القوات</span>
                  <strong className="text-xs text-[#FFD700] font-mono">{armyData?.army?.total_power || referralStats.totalEarnings || 5000}</strong>
                </div>
                <div>
                  <span className="text-[9px] text-emerald-400 block">أرباح الإحالات</span>
                  <strong className="text-xs text-emerald-400 font-mono">${((referralStats.totalEarnings || 0) / 1000).toFixed(2)}</strong>
                </div>
              </div>

              {/* Share Recruitment Link Button */}
              <Button
                onClick={handleShareOnTelegram}
                className="w-full bg-[#FFD700] hover:bg-amber-400 text-black font-extrabold text-xs h-10 font-['Cairo'] cursor-pointer flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" /> دعوة جنود وتوسيع الجيش (كسب 10% + 3%)
              </Button>
            </Card>

            {/* Mass Reminder Broadcast Card */}
            <Card className="bg-[#161618] border border-sky-500/30 text-white p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-sky-400 flex items-center gap-2">
                  <Send className="w-4 h-4 text-sky-400" />
                  إرسال نفير عام (Mass Broadcast)
                </div>
                <Badge className="bg-sky-500/10 text-sky-400 text-[10px] border-sky-500/30">تذكير تليجرام</Badge>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                أرسل إشعار نفير عام فورياً عبر تليجرام لكافة الفرسان والجنود في جيشك لشحن بطارياتهم واستئناف القتال!
              </p>
              <Button
                onClick={handleMassBroadcast}
                className="w-full bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs h-9 cursor-pointer"
              >
                📢 إرسال النفير العام للجنود ({((referralStats.level1Count || 0) + (referralStats.level2Count || 0))} جندي)
              </Button>
            </Card>
          </div>
        )}

        {/* ⚔️ TAB 3: FACTION RAIDS & TERRITORY WARS */}
        {activeTab === 'raids' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* Active Raid Warzone Card */}
            <Card className="bg-gradient-to-r from-red-950/60 via-[#161618] to-red-950/60 border-2 border-red-500/60 text-white p-4 space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-400/40 flex items-center justify-center text-red-400 shrink-0">
                    <Crosshair className="w-6 h-6 animate-spin" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-red-400 font-['Cairo'] flex items-center gap-2">
                      منطقة النزاع: إقليم نيو-توكيو الأيزومتري
                    </h3>
                    <p className="text-[10px] text-slate-300 mt-0.5">غزوات إقليمية مشتعلة - غنائم حرب تصل إلى +50,000 ذهبة!</p>
                  </div>
                </div>
              </div>

              <div className="bg-[#0d0d0f] rounded-xl p-3 border border-red-500/20 space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-300">
                  <span>حالة المعركة:</span>
                  <span className="text-red-400">مشتعلة 🔥</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-white/5">
                  <div className="h-full bg-gradient-to-r from-red-600 via-amber-500 to-[#FFD700] w-3/4 animate-pulse" />
                </div>
              </div>

              <Button
                onClick={handleCreateRaid}
                className="w-full bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs h-10 font-['Cairo'] cursor-pointer flex items-center justify-center gap-2"
              >
                <Crosshair className="w-4 h-4" /> ⚔️ شن هجوم إقليمي لجمع غنائم الحرب
              </Button>
            </Card>
          </div>
        )}

        {/* 👑 TAB 4: MILITARY ARMORY & STORE */}
        {activeTab === 'store' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* Create Paid Task Promotion Banner */}
            <Card className="bg-gradient-to-r from-yellow-950/60 via-[#161618] to-amber-950/60 border-2 border-[#FFD700]/60 text-white p-4 shadow-xl">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FFD700]/20 border border-[#FFD700]/40 flex items-center justify-center text-[#FFD700]">
                    <PlusCircle className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-[#FFD700] font-['Cairo']">ترويج مشروعك للجيوش 🚀</h3>
                    <p className="text-[10px] text-slate-300 mt-0.5">أضف مهمة ترويجية مدفوعة ليصل مشروؤك لآلاف المقاتلين!</p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowCreateTaskModal(true)}
                  className="bg-[#FFD700] hover:bg-amber-400 text-black font-extrabold text-xs h-9 px-3 shrink-0 font-['Cairo'] cursor-pointer"
                >
                  ➕ إضافة مهمة
                </Button>
              </div>
            </Card>

            {/* Rigs Armory Catalog */}
            <div className="space-y-3">
              <h2 className="text-xs font-bold text-slate-400">مناجم ومعدات الحرب المتاحة للتطوير:</h2>
              {RIGS_CATALOG.map((rig) => {
                const isOwned = userProfile.rigs?.some((r) => r.rig_id === rig.id)
                return (
                  <Card key={rig.id} className={`bg-[#161618] border border-white/10 text-white hover:border-[#FFD700]/40 transition-all ${rig.color}`}>
                    <CardContent className="p-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-[#0d0d0f] border border-[#FFD700]/20 flex items-center justify-center text-[#FFD700] shrink-0">
                          {rig.id === 'rig-1' && <Sun className="w-6 h-6 text-amber-400" />}
                          {rig.id === 'rig-2' && <Cpu className="w-6 h-6 text-[#FFD700]" />}
                          {rig.id === 'rig-3' && <Zap className="w-6 h-6 text-amber-500" />}
                          {rig.id === 'rig-4' && <Atom className="w-6 h-6 text-yellow-400" />}
                          {rig.id === 'rig-5' && <Bot className="w-6 h-6 text-amber-300" />}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-white flex items-center gap-1.5">
                            {rig.name}
                            {isOwned && <Badge className="bg-emerald-500/20 text-emerald-400 text-[9px] border-emerald-500/30">مفعل</Badge>}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{rig.description}</div>
                          <div className="text-[11px] text-amber-400 font-mono font-bold mt-1">
                            +{rig.pphBoost.toLocaleString()} ذهبة / ساعة
                          </div>
                        </div>
                      </div>

                      <Button
                        onClick={() => handleBuyRig(rig)}
                        className="bg-gradient-to-r from-[#FFD700] to-amber-600 text-black font-extrabold text-xs h-9 px-3 shrink-0"
                      >
                        {rig.cost.toLocaleString()} 🪙
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {/* 💼 TAB 5: WALLET & PROFIT-FIRST WITHDRAWAL */}
        {activeTab === 'wallet' && (
          <div className="space-y-4">
            {/* TON Wallet Connection Card */}
            <Card className="bg-gradient-to-r from-blue-950/70 via-[#161618] to-sky-950/70 border-2 border-sky-400/50 text-white p-4 space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400 shrink-0">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-sky-400 font-['Cairo'] flex items-center gap-1.5">
                      محفظة TON الرسمية على تليجرام
                      {tonWalletAddress ? (
                        <Badge className="bg-emerald-500/20 text-emerald-400 text-[9px] border-emerald-500/30">متصل 🟢</Badge>
                      ) : (
                        <Badge className="bg-amber-500/20 text-amber-400 text-[9px] border-amber-500/30">غير متصل ⚠️</Badge>
                      )}
                    </h3>
                    <p className="text-[10px] text-slate-300 mt-0.5">
                      {tonWalletAddress ? `العنوان: ${tonWalletAddress.slice(0, 10)}...${tonWalletAddress.slice(-6)}` : 'قم بربط محفظة TON لاستلام الأرباح والمكافآت مباشرة'}
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleConnectTonWallet}
                className={`w-full ${tonWalletAddress ? 'bg-sky-500 hover:bg-sky-400 text-white' : 'bg-[#FFD700] hover:bg-amber-400 text-black'} font-extrabold text-xs h-10 font-['Cairo'] cursor-pointer`}
              >
                {tonWalletAddress ? '🔄 تحديث / تغيير محفظة TON' : '🔗 ربط محفظة TON عبر تليجرام (+1,000 نقطة)'}
              </Button>
            </Card>
            {/* Convert Points Card */}
            <Card className="bg-[#161618] border-[#FFD700]/20 text-white p-4 space-y-3">
              <div className="text-xs font-bold text-[#FFD700] flex items-center gap-2">
                <Coins className="w-4 h-4 text-[#FFD700]" />
                تحويل النقاط الذهبية إلى دولار USDT
              </div>
              <div className="text-xs text-slate-400">سعر الصرف الثابت: 100,000 نقطة = $1.00 USDT</div>

              <div className="flex gap-2">
                <input
                  type="number"
                  value={convertPointsInput}
                  onChange={(e) => setConvertPointsInput(e.target.value)}
                  placeholder="عدد النقاط (مثال: 100000)"
                  className="flex-1 bg-[#0d0d0f] border border-white/10 rounded-xl px-3 text-xs text-white focus:outline-none focus:border-[#FFD700]"
                />
                <Button
                  onClick={handleConvertPoints}
                  className="bg-gradient-to-r from-[#FFD700] to-amber-600 text-black font-bold text-xs px-4"
                >
                  تحويل
                </Button>
              </div>
            </Card>

            {/* Profit-First Withdrawal Requirements Checklist */}
            <Card className="bg-[#161618] border-[#FFD700]/30 text-white p-4 space-y-3">
              <div className="text-xs font-bold text-[#FFD700] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#FFD700]" />
                شروط وأمان طلب السحب (Profit-First Safeguards)
              </div>

              <div className="space-y-2 text-xs">
                {/* Condition 1 */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#0d0d0f] border border-white/5">
                  <span className="text-slate-300">1. الحد الأدنى للسحب ($0.20 USDT)</span>
                  {userProfile.balance_usd >= 0.20 ? (
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">🟢 مكتمل</Badge>
                  ) : (
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">🔴 يتبقى الكثير</Badge>
                  )}
                </div>

                {/* Condition 2 */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#0d0d0f] border border-white/5">
                  <span className="text-slate-300">2. امتلاك 3 إحالات نشطة على الأقل</span>
                  {activeRefsCount >= 3 ? (
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">🟢 {activeRefsCount}/3 مكتمل</Badge>
                  ) : (
                    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">⚠️ {activeRefsCount}/3 نشط</Badge>
                  )}
                </div>

                {/* Condition 3 */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#0d0d0f] border border-white/5">
                  <span className="text-slate-300">3. شحن بطارية المولد/مشاهدة الإعلانات 3 مرات</span>
                  {rechargesCount >= 3 ? (
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">🟢 {rechargesCount}/3 مكتمل</Badge>
                  ) : (
                    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">⚠️ {rechargesCount}/3 مرات</Badge>
                  )}
                </div>
              </div>
            </Card>

            {/* Withdrawal Form */}
            <Card className="bg-[#161618] border-[#FFD700]/20 text-white p-4 space-y-3">
              <div className="text-xs font-bold text-[#FFD700]">طلب سحب الأرباح إلى المحفظة</div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">المبلغ المطلوب بالدولار ($):</label>
                  <input
                    type="number"
                    step="0.05"
                    value={withdrawAmountUsd}
                    onChange={(e) => setWithdrawAmountUsd(e.target.value)}
                    placeholder="0.20"
                    className="w-full bg-[#0d0d0f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FFD700]"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">شبكة التحويل المعتمدة:</label>
                  <div className="grid grid-cols-1 gap-2">
                    {(['TON'] as const).map((net) => (
                      <button
                        key={net}
                        onClick={() => setWithdrawNetwork(net)}
                        className={`py-2 text-xs font-extrabold rounded-lg border transition-all bg-[#FFD700] text-black border-[#FFD700] font-['Cairo']`}
                      >
                        {net} Network (شبكة TON الرسمية للبوت)
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">عنوان المحفظة:</label>
                  <input
                    type="text"
                    value={withdrawWalletAddress}
                    onChange={(e) => setWithdrawWalletAddress(e.target.value)}
                    placeholder="ضع عنوان محفظتك هنا..."
                    className="w-full bg-[#0d0d0f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FFD700] font-mono"
                  />
                </div>

                <Button
                  onClick={handleRequestWithdrawal}
                  disabled={isSubmittingWithdrawal}
                  className="w-full bg-gradient-to-r from-[#FFD700] to-amber-600 text-black font-extrabold text-xs h-10 mt-2"
                >
                  {isSubmittingWithdrawal ? 'جاري إرسال الطلب...' : '🚀 تقديم طلب السحب (تحويل للمراجعة اليدوية)'}
                </Button>
              </div>
            </Card>

            {/* Withdrawal History List */}
            {withdrawals.length > 0 && (
              <Card className="bg-[#161618] border border-white/10 text-white p-4 space-y-2">
                <div className="text-xs font-bold text-slate-300">سجل طلبات السحب الأخيرة:</div>
                <div className="space-y-2">
                  {withdrawals.slice(0, 5).map((w) => (
                    <div key={w.id} className="bg-[#0d0d0f] p-2.5 rounded-lg border border-white/5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-white">${Number(w.amount_usd).toFixed(2)} USDT</div>
                        <div className="text-[10px] text-slate-500 font-mono">{w.wallet_address?.slice(0, 10)}...</div>
                      </div>
                      <Badge className={w.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}>
                        {w.status === 'completed' ? '✅ تم التحويل' : '⏳ قيد المراجعة'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}
      </main>

      {/* ── BOTTOM COMMAND DOCK NAVIGATION ──────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#111114]/95 backdrop-blur-md border-t border-[#FFD700]/20 px-2 py-2">
        <div className="max-w-md mx-auto grid grid-cols-5 gap-1">
          {[
            { id: 'citadel', label: 'القلعة', icon: Castle },
            { id: 'armies', label: 'الجيوش', icon: Shield },
            { id: 'raids', label: 'الغزوات', icon: Crosshair },
            { id: 'store', label: 'المتجر', icon: Crown },
            { id: 'wallet', label: 'المحفظة', icon: Wallet },
          ].map((tab) => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as any)}
                className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all ${
                  active ? 'text-[#FFD700] bg-[#FFD700]/10 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-[#FFD700] scale-110' : 'text-slate-400'} transition-transform`} />
                <span className="text-[10px] mt-1">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* ── FOG RADAR SCANNER OVERLAY MODAL ────────────────────────────── */}
      {showFogRadarModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <Card className="bg-[#161618] border-2 border-purple-500 text-white p-6 max-w-xs w-full text-center space-y-4 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 rounded-full bg-purple-500/20 border-2 border-purple-400 flex items-center justify-center mx-auto text-purple-300">
              <Eye className="w-8 h-8 animate-spin" />
            </div>

            <div className="space-y-1">
              <h3 className="font-extrabold text-sm text-purple-300">مسح رادار الضباب الإقليمي</h3>
              <p className="text-xs text-slate-300">جاري قراءة خطوط الضباب واكتشاف غنائم الحرب...</p>
            </div>

            {fogDiscoveredLoot !== null ? (
              <div className="space-y-3">
                <div className="bg-emerald-500/20 border border-emerald-500/40 rounded-xl p-3 text-xs text-emerald-400 font-extrabold">
                  🎉 كشف الضباب بنجاح! تم العثور على صندوق غنائم بقيمة +{fogDiscoveredLoot.toLocaleString()} ذهبة!
                </div>
                <Button
                  onClick={() => setShowFogRadarModal(false)}
                  className="w-full bg-[#FFD700] text-black font-extrabold text-xs h-9"
                >
                  استلام الغنائم والعودة للقلعة
                </Button>
              </div>
            ) : (
              <div className="py-2">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#0d0d0f] border-4 border-purple-400 font-mono font-black text-2xl text-purple-300">
                  {fogScanningTimer}
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── MORALE VICTORY FEAST MODAL ───────────────────────────────────── */}
      {showFeastModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <Card className="bg-[#161618] border-2 border-[#FFD700] text-white p-6 max-w-xs w-full text-center space-y-4 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 rounded-full bg-[#FFD700]/20 border-2 border-[#FFD700] flex items-center justify-center mx-auto text-[#FFD700]">
              <Flame className="w-8 h-8 animate-bounce" />
            </div>

            <div className="space-y-1">
              <h3 className="font-extrabold text-sm text-[#FFD700]">إقامة مأدبة النصر للفرسان</h3>
              <p className="text-xs text-slate-300">شاهد إعلان المكافأة لإعادة معنويات الجيوش بالكامل إلى 100% وزيادة سرعة التعدين!</p>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => setShowFeastModal(false)} variant="outline" className="flex-1 text-xs border-white/20">
                إلغاء
              </Button>
              <Button onClick={handleVictoryFeast} className="flex-1 bg-[#FFD700] text-black font-extrabold text-xs">
                🍗 إقامة المأدبة
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ── LIVE AD WATCHING OVERLAY MODAL ──────────────────────────────── */}
      {activeAd && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <Card className="bg-[#161618] border border-[#FFD700]/40 text-white p-6 max-w-xs w-full text-center space-y-4 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 rounded-full bg-[#FFD700]/10 border-2 border-[#FFD700] flex items-center justify-center mx-auto text-[#FFD700]">
              <Tv className="w-8 h-8 animate-pulse" />
            </div>

            <div className="space-y-1">
              <h3 className="font-extrabold text-sm text-[#FFD700]">{activeAd.name}</h3>
              <p className="text-xs text-slate-300">انتظر انتهاء المؤشر لاحتساب المكافأة تلقائياً!</p>
            </div>

            <div className="py-2">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#0d0d0f] border-4 border-[#FFD700] font-mono font-black text-2xl text-[#FFD700]">
                {adTimer}
              </div>
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-2.5 text-xs text-emerald-400 font-bold">
              💰 المكافأة المستحقة: +{activeAd.points.toLocaleString()} نقطة
            </div>

            <p className="text-[10px] text-slate-500">
              لا تغلق هذه الشاشة حتى انتهاء المؤشر لضمان احتساب النقاط
            </p>
          </Card>
        </div>
      )}
      {/* ── CREATE PAID TASK OVERLAY MODAL ─────────────────────────────── */}
      {showCreateTaskModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <Card className="bg-[#161618] border-2 border-[#FFD700] text-white p-5 max-w-sm w-full space-y-4 shadow-2xl relative animate-in fade-in zoom-in duration-200 dir-rtl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-[#FFD700]" />
                <h3 className="font-black text-sm text-[#FFD700] font-['Cairo']">إضافة مهمة ترويجية مدفوعة</h3>
              </div>
              <button
                onClick={() => setShowCreateTaskModal(false)}
                className="text-white/60 hover:text-white p-1 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePayAndCreateTask} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] text-slate-300 block mb-1 font-bold">اسم التكليف / عنوان القناة</label>
                <input
                  type="text"
                  placeholder="مثال: اشترك في قناة أسرار التداول"
                  value={newPaidTaskTitle}
                  onChange={(e) => setNewPaidTaskTitle(e.target.value)}
                  className="w-full bg-[#0d0d0f] border border-white/20 rounded-lg px-3 py-2 text-white font-['Cairo'] text-xs focus:border-[#FFD700] outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-300 block mb-1 font-bold">رابط المهمة / القناة (URL)</label>
                <input
                  type="url"
                  placeholder="https://t.me/your_channel"
                  value={newPaidTaskUrl}
                  onChange={(e) => setNewPaidTaskUrl(e.target.value)}
                  className="w-full bg-[#0d0d0f] border border-white/20 rounded-lg px-3 py-2 text-white font-mono text-xs focus:border-[#FFD700] outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-300 block mb-1 font-bold">مكافأة المستخدم (نقاط)</label>
                  <input
                    type="number"
                    value={newPaidTaskReward}
                    onChange={(e) => setNewPaidTaskReward(e.target.value)}
                    className="w-full bg-[#0d0d0f] border border-white/20 rounded-lg px-2.5 py-2 text-white font-mono text-xs focus:border-[#FFD700] outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-300 block mb-1 font-bold">عدد التنفيذات المطلوبة</label>
                  <input
                    type="number"
                    value={newPaidTaskTarget}
                    onChange={(e) => setNewPaidTaskTarget(e.target.value)}
                    className="w-full bg-[#0d0d0f] border border-white/20 rounded-lg px-2.5 py-2 text-white font-mono text-xs focus:border-[#FFD700] outline-none"
                    required
                  />
                </div>
              </div>

              {/* Deposit Payment Box */}
              <div className="bg-[#0d0d0f] border border-[#FFD700]/40 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">سعر الخدمة:</span>
                  <span className="text-[#FFD700] font-bold">$10 لكل 1,000 إنجاز ($0.01 / تنفيذ)</span>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-white/10">
                  <span className="text-slate-300 font-bold">إجمالي رسوم الإيداع المستحقة:</span>
                  <span className="text-[#FFD700] font-black font-mono text-sm">
                    ${((parseInt(newPaidTaskTarget) || 100) * 0.01).toFixed(2)} (~{(((parseInt(newPaidTaskTarget) || 100) * 0.01) / 5.0).toFixed(3)} TON)
                  </span>
                </div>

                <div className="text-[10px] text-slate-300 leading-relaxed bg-black/40 p-2 rounded border border-white/5 space-y-1">
                  {wallet ? (
                    <div className="text-[10px] text-emerald-400 flex items-center gap-1 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      المحفظة متصلة: <span className="font-mono dir-ltr">{tonWalletAddress.slice(0, 8)}...{tonWalletAddress.slice(-6)}</span>
                    </div>
                  ) : (
                    <div className="text-[10px] text-amber-400">
                      💡 سيطلب منك التطبيق ربط محفظة TON وتأكيد التحويل مباشرة بدون الحاجة لإدخال رقم المعاملة يدوياً.
                    </div>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-[#FFD700] hover:bg-amber-400 text-black font-extrabold text-xs h-10 rounded-lg font-['Cairo'] cursor-pointer flex items-center justify-center gap-1.5"
              >
                💳 دفع وتفعيل المهمة مباشرة عبر المحفظة (${((parseInt(newPaidTaskTarget) || 100) * 0.01).toFixed(2)})
              </Button>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
