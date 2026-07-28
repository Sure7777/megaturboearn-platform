// TMA (Telegram Mini App) API Client
// Talks to the Cloudflare Worker for real D1 data
// Falls back to mock data in sandbox preview

const WORKER_URL = typeof window !== 'undefined' ? window.location.origin : ''

interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
}

// Detect if we're in a Telegram Mini App environment
function getTelegramUser(): TelegramUser | null {
  try {
    if (typeof window === 'undefined') return null
    // @ts-ignore
    if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
      // @ts-ignore
      return window.Telegram.WebApp.initDataUnsafe.user
    }
  } catch {}
  return null
}

// Get user from URL params (for sandbox testing)
function getUrlUserId(): string | null {
  try {
    if (typeof window === 'undefined') return null
    const params = new URLSearchParams(window.location.search)
    return params.get('userId') || params.get('tgWebAppStartParam')
  } catch {}
  return null
}

export function getCurrentUserId(): string {
  const tgUser = getTelegramUser()
  if (tgUser) return String(tgUser.id)
  const urlId = getUrlUserId()
  if (urlId) return urlId
  // Fallback demo ID
  return '6960850082'
}

export function getCurrentUserName(): string {
  const tgUser = getTelegramUser()
  if (tgUser) return tgUser.first_name
  return 'مستخدم'
}

async function fetchAPI<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${WORKER_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

async function postAPI<T>(path: string, body: any): Promise<T | null> {
  try {
    const res = await fetch(`${WORKER_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

// ── Types ──────────────────────────────────────────────────────────────────────
export interface TMAUser {
  id: string
  username: string
  display_name: string
  balance_points: number
  balance_usd: number
  level: string
  streak_count: number
  last_streak_date: string
  last_lucky_wheel: string
  referred_by: string
  is_blocked: number
  created_at: string
  // Dark Energy Mining & Rigs
  mining_pph?: number
  battery_expires_at?: string
  last_passive_claim_at?: string
  recharge_count?: number
  tap_count?: number
  ad_views_count?: number
  active_referrals_count?: number
  pending_passive_points?: number
  battery_active?: boolean
  rigs?: Array<{ rig_id: string; level: number }>
}

export interface TMARig {
  id: string
  name: string
  nameEn: string
  description: string
  pphBoost: number
  cost: number
  icon: string
  color: string
}

export const RIGS_CATALOG: TMARig[] = [
  {
    id: 'rig-1',
    name: 'محول إشعاع الشمس',
    nameEn: 'Solar Converter',
    description: 'يولد طاقة شمسية مستمرة لإنتاج الذهب بدون انقطاع',
    pphBoost: 10,
    cost: 500,
    icon: 'Sun',
    color: 'from-amber-500/20 to-yellow-600/10 border-amber-500/40'
  },
  {
    id: 'rig-2',
    name: 'منجم كوانتوم السريع',
    nameEn: 'Quantum Rig v1',
    description: 'تعدين حاسوبي خارق السرعة بالخوارزميات الكمية',
    pphBoost: 35,
    cost: 1500,
    icon: 'Cpu',
    color: 'from-yellow-500/20 to-amber-700/10 border-yellow-500/40'
  },
  {
    id: 'rig-3',
    name: 'مستخرج المادة المظلمة',
    nameEn: 'Dark Matter Extractor',
    description: 'يستخلص الطاقة المظلمة المكثفة لمضاعفة الأرباح',
    pphBoost: 120,
    cost: 5000,
    icon: 'Zap',
    color: 'from-amber-400/20 to-yellow-500/10 border-amber-400/50'
  },
  {
    id: 'rig-4',
    name: 'مفاعل الاندماج النووي',
    nameEn: 'Fusion Reactor',
    description: 'مفاعل متطور يوفر طاقة هائلة لمناجم الذهب',
    pphBoost: 350,
    cost: 15000,
    icon: 'Atom',
    color: 'from-yellow-400/25 to-amber-500/15 border-yellow-400/60'
  },
  {
    id: 'rig-5',
    name: 'النواة الرقمية بالذكاء الاصطناعي',
    nameEn: 'AI Cyber Core',
    description: 'تعدين ذاتي فائق السرعة مقاد بخوارزميات الذكاء الاصطناعي',
    pphBoost: 1000,
    cost: 40000,
    icon: 'Bot',
    color: 'from-yellow-300/30 to-amber-400/20 border-yellow-300/80'
  },
  {
    id: 'rig-6',
    name: 'محطة الكوانتوم المجرية',
    nameEn: 'Galactic Quantum Station',
    description: 'محطة أبحاث مجرية لمعالجة آلاف المعاملات بالثانية',
    pphBoost: 2800,
    cost: 100000,
    icon: 'Flame',
    color: 'from-amber-600/30 to-yellow-500/20 border-amber-500/70'
  },
  {
    id: 'rig-7',
    name: 'المولد التكعيبي الخارق',
    nameEn: 'Hypercube Generator',
    description: 'تعدين أبعاد متعددة يولّد ملايين النقاط الذهبية',
    pphBoost: 7500,
    cost: 250000,
    icon: 'Sparkles',
    color: 'from-yellow-400/40 to-amber-600/30 border-yellow-400/90'
  },
  {
    id: 'rig-8',
    name: 'مجمع الطاقة الكوني الفائق',
    nameEn: 'Cosmic Super Array',
    description: 'أعلى مستوى تعدين كوني في مجرة MegaTurbo',
    pphBoost: 18000,
    cost: 500000,
    icon: 'Coins',
    color: 'from-amber-300/50 via-yellow-400/30 to-amber-500/40 border-[#FFD700]'
  }
]

export interface TMAItem {
  id: string
  group_id: string
  name: string
  type: string
  reward_points: number
  url: string
  daily_limit: number
  current_completions: number
  max_total_completions: number
  is_active: number
  creator_id?: string
  creator_name?: string
  total_deposit_usd?: number
  admin_share_usd?: number
  transferred_to_vault?: boolean
  created_at?: string
}

export interface TMAAdGroup {
  id: string
  name: string
  type: string
  order_index: number
  is_active: number
}

export interface TMATransaction {
  id: string
  user_id: string
  type: string
  amount_points: number
  amount_usd: number
  description: string
  created_at: string
}

// ── API ────────────────────────────────────────────────────────────────────────
export const tmaAPI = {
  // Get user profile
  getUser: (userId: string) => fetchAPI<TMAUser>(`/api/tma/user/${userId}`),

  // Tap Mining
  tapMining: (userId: string, tapsCount: number = 1) =>
    postAPI<{ success: boolean; pointsAdded: number; newBalance: number }>('/api/tma/tap', { userId, tapsCount }),

  // Recharge Battery (4 hours)
  rechargeBattery: (userId: string) =>
    postAPI<{ success: boolean; batteryExpiresAt: string; bonusPoints: number; message: string }>('/api/tma/recharge-battery', { userId }),

  // Claim Passive Earnings
  claimPassiveEarnings: (userId: string) =>
    postAPI<{ success: boolean; claimedPoints: number; newBalance: number; message: string }>('/api/tma/claim-passive', { userId }),

  // Buy or Upgrade Rig
  buyRig: (userId: string, rigId: string) =>
    postAPI<{ success: boolean; newPph: number; newBalance: number; message?: string; error?: string }>('/api/tma/buy-rig', { userId, rigId }),

  // Claim Daily Cipher
  claimDailyCipher: (userId: string, word: string) =>
    postAPI<{ success: boolean; points?: number; message?: string; error?: string }>('/api/tma/cipher/claim', { userId, word }),

  // Claim Daily Combo
  claimDailyCombo: (userId: string) =>
    postAPI<{ success: boolean; points?: number; message?: string; error?: string }>('/api/tma/combo/claim', { userId }),

  // Send Energy Pulse to Referral/Friend
  sendPulse: (userId: string, targetUserId: string) =>
    postAPI<{ success: boolean; message?: string; error?: string }>('/api/tma/send-pulse', { userId, targetUserId }),

  // Get items by type
  getItems: (type: string) => fetchAPI<TMAItem[]>(`/api/tma/items?type=${type}`),

  // Get ad groups
  getAdGroups: () => fetchAPI<TMAAdGroup[]>('/api/tma/groups'),

  // Get user transactions
  getTransactions: (userId: string) => fetchAPI<TMATransaction[]>(`/api/tma/transactions/${userId}`),

  // Complete an item (ad/task)
  completeItem: (userId: string, itemId: string, type: string) =>
    postAPI<{ success: boolean; points: number }>('/api/tma/complete', { userId, itemId, type }),

  // Convert points to USD
  convertPoints: (userId: string, points: number) =>
    postAPI<{ success: boolean; usd: number }>('/api/tma/convert', { userId, points }),

  // Request withdrawal
  requestWithdrawal: (userId: string, amountUsd: number, network: string, walletAddress: string) =>
    postAPI<{ success: boolean; id?: string; message?: string; error?: string }>('/api/tma/withdraw', { userId, amountUsd, network, walletAddress }),

  // Get withdrawal history
  getWithdrawals: (userId: string) =>
    fetchAPI<any[]>(`/api/tma/withdrawals/${userId}`),

  // Spin lucky wheel
  spinLuckyWheel: (userId: string) =>
    postAPI<{ success: boolean; points: number; canSpin: boolean; lastSpin: string }>('/api/tma/lucky-wheel', { userId }),

  // Get referrals
  getReferrals: (userId: string) =>
    fetchAPI<{ level1Count: number; level2Count: number; totalEarnings: number }>(`/api/tma/referrals/${userId}`),

  // Claim promo code
  claimPromoCode: (userId: string, code: string) =>
    postAPI<{ success: boolean; points?: number; message?: string; error?: string }>('/api/tma/promo/claim', { userId, code }),

  // Mass Referral Broadcast
  massBroadcast: (userId: string, costPoints: number) =>
    postAPI<{ success: boolean; count?: number; message?: string; error?: string }>('/api/tma/mass-broadcast', { userId, costPoints }),

  // Create Paid Task via TON Deposit
  createPaidTask: (data: {
    userId: string
    title: string
    url: string
    rewardPoints: number
    targetCompletions: number
    depositAmountUsd: number
    txHash?: string
  }) => postAPI<{ success: boolean; taskId?: string; message?: string; error?: string }>('/api/tma/create-paid-task', data),

  // Army & Squad Ranks
  getMyArmy: (userId: string) =>
    fetchAPI<{ inArmy: boolean; army?: any; userRank?: string; members?: any[]; activeRaids?: any[] }>(`/api/tma/army/my/${userId}`),

  createArmy: (userId: string, name: string, logo?: string) =>
    postAPI<{ success: boolean; armyId?: string; message?: string; error?: string }>('/api/tma/army/create', { userId, name, logo }),

  joinArmy: (userId: string, armyId: string) =>
    postAPI<{ success: boolean; message?: string; error?: string }>('/api/tma/army/join', { userId, armyId }),

  promoteArmyMember: (generalId: string, targetUserId: string, newRank: string) =>
    postAPI<{ success: boolean; message?: string; error?: string }>('/api/tma/army/promote', { generalId, targetUserId, newRank }),

  createRaid: (userId: string, armyId: string, targetName?: string) =>
    postAPI<{ success: boolean; raidId?: string; message?: string; error?: string }>('/api/tma/army/raid/create', { userId, armyId, targetName }),

  joinRaid: (userId: string, raidId: string) =>
    postAPI<{ success: boolean; victory?: boolean; message?: string; error?: string }>('/api/tma/army/raid/join', { userId, raidId }),

  restoreMorale: (userId: string) =>
    postAPI<{ success: boolean; message?: string; error?: string }>('/api/tma/morale/restore', { userId }),
}

// ── Mock fallback for sandbox ──────────────────────────────────────────────────
export const mockUser: TMAUser = {
  id: '6960850082',
  username: 'megaturbo',
  display_name: 'مستخدم',
  balance_points: 0,
  balance_usd: 0,
  level: 'المبتدئ',
  streak_count: 0,
  last_streak_date: new Date().toISOString().split('T')[0],
  last_lucky_wheel: '',
  referred_by: '',
  is_blocked: 0,
  created_at: new Date().toISOString(),
  mining_pph: 0,
  battery_expires_at: new Date().toISOString(),
  last_passive_claim_at: new Date().toISOString(),
  recharge_count: 0,
  tap_count: 0,
  ad_views_count: 0,
  active_referrals_count: 0,
  pending_passive_points: 0,
  battery_active: false,
  rigs: []
}

export function getStoredUserProfile(userId: string): TMAUser {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(`tma_user_${userId}`)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed && typeof parsed.balance_points === 'number') {
          return parsed
        }
      }
    } catch {}
  }
  return mockUser
}

export function saveStoredUserProfile(userId: string, user: TMAUser): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`tma_user_${userId}`, JSON.stringify(user))
    } catch {}
  }
}

