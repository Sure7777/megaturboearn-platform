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
}

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
  getUser: (userId: string) => fetchAPI<TMAUser>(`/api/user/${userId}`),

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
    postAPI<{ success: boolean; id: string }>('/api/tma/withdraw', { userId, amountUsd, network, walletAddress }),

  // Get withdrawal history
  getWithdrawals: (userId: string) =>
    fetchAPI<any[]>(`/api/tma/withdrawals/${userId}`),

  // Spin lucky wheel
  spinLuckyWheel: (userId: string) =>
    postAPI<{ success: boolean; points: number; canSpin: boolean; lastSpin: string }>('/api/tma/lucky-wheel', { userId }),

  // Get referrals
  getReferrals: (userId: string) =>
    fetchAPI<{ level1Count: number; level2Count: number; totalEarnings: number }>(`/api/tma/referrals/${userId}`),
}

// ── Mock fallback for sandbox ──────────────────────────────────────────────────
export const mockUser: TMAUser = {
  id: '6960850082',
  username: 'megaturbo',
  display_name: 'مستخدم',
  balance_points: 1250,
  balance_usd: 1.25,
  level: 'bronze',
  streak_count: 3,
  last_streak_date: new Date().toISOString().split('T')[0],
  last_lucky_wheel: '',
  referred_by: '',
  is_blocked: 0,
  created_at: new Date().toISOString(),
}
