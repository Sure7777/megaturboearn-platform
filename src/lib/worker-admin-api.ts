// Worker Admin API Client — calls the Cloudflare Worker's /api/admin/* endpoints
// Falls back to returning empty data when the worker is unreachable (e.g. in sandbox preview)

const WORKER_URL = typeof window !== 'undefined' ? window.location.origin : ''
const ADMIN_KEY = '6960850082'

async function fetchAdmin<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${WORKER_URL}${path}`, {
      headers: {
        'X-Admin-API-Key': ADMIN_KEY,
        'Content-Type': 'application/json',
      },
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

async function postAdmin<T>(path: string, body: any): Promise<T | null> {
  try {
    const res = await fetch(`${WORKER_URL}${path}`, {
      method: 'POST',
      headers: {
        'X-Admin-API-Key': ADMIN_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

async function deleteAdmin<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${WORKER_URL}${path}`, {
      method: 'DELETE',
      headers: {
        'X-Admin-API-Key': ADMIN_KEY,
        'Content-Type': 'application/json',
      },
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

export interface WorkerStats {
  totalUsers: number
  totalAds: number
  pendingWithdrawals: number
  totalEarnings: number
}

export interface WorkerItem {
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
  created_at: string
}

export interface WorkerUser {
  id: string
  username: string
  display_name: string
  balance_points: number
  balance_usd: number
  level: string
  is_blocked: number
  created_at: string
}

export interface WorkerWithdrawal {
  id: string
  user_id: string
  amount_usd: number
  network: string
  wallet_address: string
  status: string
  created_at: string
}

export const workerAdminApi = {
  getStats: () => fetchAdmin<WorkerStats>('/api/admin/stats'),
  getItems: () => fetchAdmin<WorkerItem[]>('/api/admin/items'),
  getUsers: () => fetchAdmin<WorkerUser[]>('/api/admin/users'),
  getWithdrawals: () => fetchAdmin<WorkerWithdrawal[]>('/api/admin/withdrawals'),
  processWithdrawal: (id: string, status: string) => postAdmin<{ success: boolean }>('/api/admin/withdrawals/process', { id, status }),
  toggleBlock: (id: string, blocked: boolean) => postAdmin<{ success: boolean }>('/api/admin/users/block', { id, blocked: blocked ? 1 : 0 }),
  updateUserBalance: (id: string, points: number, usd: number) => postAdmin<{ success: boolean }>('/api/admin/users/balance', { id, points, usd }),
  toggleItem: (id: string, active: boolean) => postAdmin<{ success: boolean }>('/api/admin/items/toggle', { id, active: active ? 1 : 0 }),
  deleteItem: (id: string) => deleteAdmin<{ success: boolean }>(`/api/admin/items/${id}`),
  createItem: (data: { groupId: string; name: string; type: string; rewardPoints: number; url: string; dailyLimit?: number; maxCompletions?: number }) => postAdmin<{ success: boolean; id: string }>('/api/admin/items', data),
  getSettings: () => fetchAdmin<Record<string, string>>('/api/admin/settings'),
  saveSettings: (settings: Record<string, string>) => postAdmin<{ success: boolean }>('/api/admin/settings', settings),
}
