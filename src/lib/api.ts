import { blink } from '@/blink/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@blinkdotnew/ui'
import { workerAdminApi } from './worker-admin-api'

// Bypass typescript strict property checks on blink.db
const db = (blink as any).db

// ── Types ────────────────────────────────────────────────────────────────────
export interface User {
  id: string; username: string; displayName: string; balancePoints: number; balanceUsd: number
  level: string; referredBy: string; streakCount: number; lastStreakDate: string
  lastLuckyWheel: string; createdAt: string; isBlocked: number; isAdmin: number
}
export interface AdGroup { id: string; name: string; type: string; orderIndex: number; isActive: number }
export interface Item {
  id: string; groupId: string; name: string; type: string; rewardPoints: number
  url: string; dailyLimit: number; currentCompletions: number; maxTotalCompletions: number
  isActive: number; createdAt: string
}
export interface Withdrawal { id: string; userId: string; amountUsd: number; network: string; walletAddress: string; status: string; createdAt: string }
export interface Transaction { id: string; userId: string; type: string; amountPoints: number; amountUsd: number; description: string; createdAt: string }
export interface Referral { referrerId: string; referredId: string; level: number; commissionEarned: number; createdAt: string }
export interface UserActivity { userId: string; itemId: string; type: string; completedAt: string }

function gid() { return crypto.randomUUID() }

// ── Dashboard Stats ──────────────────────────────────────────────────────────
export function useDashboardStats() {
  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: async () => {
      // Try to get live stats from Worker
      const liveStats = await workerAdminApi.getStats()
      if (liveStats) {
        return {
          totalUsers: liveStats.totalUsers,
          totalAds: liveStats.totalAds,
          pendingWithdrawals: liveStats.pendingWithdrawals,
          totalTransactions: 0,
          totalReferrals: 0,
        }
      }

      // Fallback
      const [users, items, pending, txs, refs] = await Promise.all([
        db.users.count().catch(() => 0),
        db.items.count({ where: { isActive: "1" } }).catch(() => 0),
        db.withdrawals.count({ where: { status: 'pending' } }).catch(() => 0),
        db.transactions.count().catch(() => 0),
        db.referrals.count().catch(() => 0),
      ])
      return { totalUsers: users, totalAds: items, pendingWithdrawals: pending, totalTransactions: txs, totalReferrals: refs }
    },
    refetchInterval: 60_000,
  })
}

// ── Users ────────────────────────────────────────────────────────────────────
export function useUsers() {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const liveUsers = await workerAdminApi.getUsers()
      if (liveUsers && liveUsers.length > 0) {
        return liveUsers.map(u => ({
          id: u.id,
          username: u.username,
          displayName: u.display_name || u.username || 'مستخدم',
          balancePoints: u.balance_points,
          balanceUsd: u.balance_usd,
          level: u.level || 'bronze',
          referredBy: '',
          streakCount: 0,
          lastStreakDate: '',
          lastLuckyWheel: '',
          createdAt: u.created_at,
          isBlocked: u.is_blocked,
          isAdmin: 0
        }))
      }

      const result = await db.users.list({ orderBy: { createdAt: 'desc' } })
      return result as unknown as User[]
    },
    refetchInterval: 30_000,
  })
}

export function useToggleBlock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, blocked }: { id: string; blocked: boolean }) => {
      const res = await workerAdminApi.toggleBlock(id, blocked)
      if (!res || !res.success) {
        await db.users.update(id, { isBlocked: blocked ? 1 : 0 })
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'users'] }); toast.success('تم تحديث الحالة') },
    onError: () => toast.error('فشل تحديث الحالة'),
  })
}

export function useUpdateUserPoints() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, points, usd }: { id: string; points: number; usd: number }) => {
      const res = await workerAdminApi.updateUserBalance(id, points, usd)
      if (!res || !res.success) {
        await db.users.update(id, { balancePoints: points, balanceUsd: usd })
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'users'] }); toast.success('تم تحديث الرصيد') },
    onError: () => toast.error('فشل تحديث الرصيد'),
  })
}

// ── Ad Groups & Items ────────────────────────────────────────────────────────
export function useAdGroups() {
  return useQuery({
    queryKey: ['admin', 'adGroups'],
    queryFn: async () => {
      const result = await db.adGroups.list({ orderBy: { type: 'asc', orderIndex: 'asc' } })
      return result as unknown as AdGroup[]
    },
  })
}

export function useItems(groupId?: string) {
  return useQuery({
    queryKey: ['admin', 'items', groupId],
    queryFn: async () => {
      const liveItems = await workerAdminApi.getItems()
      if (liveItems && liveItems.length > 0) {
        let items = liveItems.map(i => ({
          id: i.id,
          groupId: i.group_id,
          name: i.name,
          type: i.type,
          rewardPoints: i.reward_points,
          url: i.url,
          dailyLimit: i.daily_limit,
          currentCompletions: i.current_completions,
          maxTotalCompletions: i.max_total_completions,
          isActive: i.is_active,
          createdAt: i.created_at
        }))
        if (groupId) {
          items = items.filter(i => i.groupId === groupId)
        }
        return items
      }

      const opts: any = { orderBy: { createdAt: 'desc' } }
      if (groupId) opts.where = { groupId }
      const result = await db.items.list(opts)
      return result as unknown as Item[]
    },
    enabled: true,
  })
}

export function useCreateItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: { groupId: string; name: string; type: string; rewardPoints: number; url: string; dailyLimit?: number; maxTotalCompletions?: number }) => {
      const res = await workerAdminApi.createItem({
        groupId: data.groupId,
        name: data.name,
        type: data.type,
        rewardPoints: data.rewardPoints,
        url: data.url,
        dailyLimit: data.dailyLimit,
        maxCompletions: data.maxTotalCompletions
      })
      if (!res || !res.success) {
        await db.items.create({ id: gid(), groupId: data.groupId, name: data.name, type: data.type, rewardPoints: data.rewardPoints, url: data.url, dailyLimit: data.dailyLimit ?? 1, maxTotalCompletions: data.maxTotalCompletions ?? 1000, currentCompletions: 0, isActive: 1 })
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'items'] }); toast.success('تمت الإضافة') },
    onError: (e: any) => toast.error(`خطأ: ${e?.message || 'فشل الإضافة'}`),
  })
}

export function useDeleteItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await workerAdminApi.deleteItem(id)
      if (!res || !res.success) {
        await db.items.delete(id)
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'items'] }); toast.success('تم الحذف') },
  })
}

export function useToggleItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const res = await workerAdminApi.toggleItem(id, active)
      if (!res || !res.success) {
        await db.items.update(id, { isActive: active ? 1 : 0 })
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'items'] }); toast.success('تم التحديث') },
  })
}

// ── Withdrawals ──────────────────────────────────────────────────────────────
export function useWithdrawals() {
  return useQuery({
    queryKey: ['admin', 'withdrawals'],
    queryFn: async () => {
      const liveWiths = await workerAdminApi.getWithdrawals()
      if (liveWiths && liveWiths.length > 0) {
        return liveWiths.map(w => ({
          id: w.id,
          userId: w.user_id,
          amountUsd: w.amount_usd,
          network: w.network,
          walletAddress: w.wallet_address,
          status: w.status,
          createdAt: w.created_at
        }))
      }

      const result = await db.withdrawals.list({ orderBy: { createdAt: 'desc' } })
      return result as unknown as Withdrawal[]
    },
    refetchInterval: 30_000,
  })
}

export function useProcessWithdrawal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await workerAdminApi.processWithdrawal(id, status)
      if (!res || !res.success) {
        await db.withdrawals.update(id, { status })
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'withdrawals'] }); qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] }); toast.success('تمت المعالجة') },
  })
}

// ── Settings ─────────────────────────────────────────────────────────────────
export function useSettings() {
  return useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: async () => {
      const liveSettings = await workerAdminApi.getSettings()
      if (liveSettings) return liveSettings

      const result = await db.settings.list()
      const map: Record<string, string> = {}
      for (const row of result as unknown as { key: string; value: string }[]) { map[row.key] = row.value }
      return map
    },
  })
}

export function useSaveSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (entries: Record<string, string>) => {
      const res = await workerAdminApi.saveSettings(entries)
      if (!res || !res.success) {
        for (const [key, value] of Object.entries(entries)) {
          const exists = await db.settings.exists({ where: { key } })
          if (exists) await db.settings.update(key, { value })
          else await db.settings.create({ key, value })
        }
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'settings'] }); toast.success('تم حفظ الإعدادات') },
    onError: () => toast.error('فشل حفظ الإعدادات'),
  })
}

// ── Transactions (Vault) ─────────────────────────────────────────────────────
export function useTransactions() {
  return useQuery({
    queryKey: ['admin', 'transactions'],
    queryFn: async () => {
      const result = await db.transactions.list({ orderBy: { createdAt: 'desc' }, limit: 100 })
      return result as unknown as Transaction[]
    },
  })
}

// ── Referrals ────────────────────────────────────────────────────────────────
export function useReferrals() {
  return useQuery({
    queryKey: ['admin', 'referrals'],
    queryFn: async () => {
      const result = await db.referrals.list({ orderBy: { createdAt: 'desc' }, limit: 50 })
      return result as unknown as Referral[]
    },
  })
}
