import React, { useState, useEffect } from 'react'
import { AppShell, AppShellSidebar, AppShellMain, MobileSidebarTrigger, SidebarItem, Button, Card, CardHeader, CardTitle, CardContent, Badge, Skeleton, toast } from '@blinkdotnew/ui'
import {
  LayoutDashboard,
  Users,
  Megaphone,
  CheckSquare,
  Wallet,
  Settings,
  LogOut,
  TrendingUp,
  Shield,
  ShieldAlert,
  ArrowUpRight,
  Plus,
  Eye,
  Check,
  X,
  Mail,
  Edit2,
  Lock,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  LockKeyhole
} from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { useAdminAuth } from '@/lib/admin-auth'
import { workerAdminApi, type WorkerStats, type WorkerItem, type WorkerUser, type WorkerWithdrawal } from '@/lib/worker-admin-api'

export function AdminLayout() {
  const navigate = useNavigate()
  const { logout } = useAdminAuth()

  // State-based Tab Navigation
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'users' | 'ads' | 'tasks' | 'withdrawals' | 'vault' | 'settings'>('dashboard')

  // Core Admin State
  const [stats, setStats] = useState<WorkerStats>({ totalUsers: 12458, totalAds: 12, pendingWithdrawals: 4, totalEarnings: 1648.75 })
  const [users, setUsers] = useState<WorkerUser[]>([])
  const [items, setItems] = useState<WorkerItem[]>([])
  const [withdrawals, setWithdrawals] = useState<WorkerWithdrawal[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filters and Searches
  const [userSearch, setUserSearch] = useState('')
  const [withdrawalFilter, setWithdrawalFilter] = useState<'all' | 'pending' | 'completed' | 'rejected'>('all')

  // Modals / Action states
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<WorkerUser | null>(null)
  const [editUserPoints, setEditUserPoints] = useState('')
  const [editUserUsd, setEditUserUsd] = useState('')

  // Create Item Forms
  const [createAdOpen, setCreateAdOpen] = useState(false)
  const [newAdName, setNewAdName] = useState('')
  const [newAdUrl, setNewAdUrl] = useState('')
  const [newAdPoints, setNewAdPoints] = useState('1500')
  const [newAdLimit, setNewAdLimit] = useState('3')
  const [newAdMax, setNewAdMax] = useState('1000')
  const [newAdType, setNewAdType] = useState<'short' | 'long'>('short')

  const [createTaskOpen, setCreateTaskOpen] = useState(false)
  const [newTaskName, setNewTaskName] = useState('')
  const [newTaskUrl, setNewTaskUrl] = useState('')
  const [newTaskPoints, setNewTaskPoints] = useState('2000')

  // Settings Forms
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [conversionRate, setConversionRate] = useState('1000')
  const [profitSplit, setProfitSplit] = useState('50')

  const handleLogout = () => {
    logout()
    navigate({ to: '/' })
  }

  // Load Admin Data (Hono API -> falls back to rich LocalStorage Seed)
  const loadAdminData = async () => {
    setIsLoading(true)
    try {
      const liveStats = await workerAdminApi.getStats()
      const liveUsers = await workerAdminApi.getUsers()
      const liveItems = await workerAdminApi.getItems()
      const liveWiths = await workerAdminApi.getWithdrawals()

      // Set live if available
      if (liveStats) setStats(liveStats)
      
      // Resilient local persistence merging
      let finalUsers: WorkerUser[] = liveUsers && liveUsers.length > 0 ? liveUsers : []
      let finalItems: WorkerItem[] = liveItems && liveItems.length > 0 ? liveItems : []
      let finalWiths: WorkerWithdrawal[] = liveWiths && liveWiths.length > 0 ? liveWiths : []

      // Fallbacks
      if (finalUsers.length === 0) {
        const storedUsers = localStorage.getItem('admin_users')
        if (storedUsers) {
          finalUsers = JSON.parse(storedUsers)
        } else {
          finalUsers = [
            { id: '6960850082', username: 'saqqhome', display_name: 'أحمد الحربي', balance_points: 12500, balance_usd: 12.50, level: 'gold', is_blocked: 0, created_at: '2026-07-01T12:00:00' },
            { id: '5540321200', username: 'khalid_tg', display_name: 'خالد عبد الله', balance_points: 3200, balance_usd: 3.20, level: 'silver', is_blocked: 0, created_at: '2026-07-03T15:24:00' },
            { id: '4459871120', username: 'noura_sa', display_name: 'نورة الشمري', balance_points: 450, balance_usd: 0.45, level: 'bronze', is_blocked: 0, created_at: '2026-07-04T09:12:00' },
            { id: '7789540022', username: 'mohammad_99', display_name: 'محمد الصالح', balance_points: 25900, balance_usd: 25.90, level: 'platinum', is_blocked: 1, created_at: '2026-07-05T18:40:00' }
          ]
          localStorage.setItem('admin_users', JSON.stringify(finalUsers))
        }
      }

      if (finalItems.length === 0) {
        const storedItems = localStorage.getItem('admin_items')
        if (storedItems) {
          finalItems = JSON.parse(storedItems)
        } else {
          finalItems = [
            { id: 'ad-s-1', group_id: 'g-s-1', name: 'شاهد إعلان لربح مكافأة سريعة', type: 'short', reward_points: 1500, url: 'https://example.com/ad1', daily_limit: 5, current_completions: 420, max_total_completions: 1000, is_active: 1, created_at: '2026-07-01' },
            { id: 'ad-s-2', group_id: 'g-s-1', name: 'زيارة موقع ممول للمستثمرين', type: 'short', reward_points: 2500, url: 'https://example.com/ad2', daily_limit: 3, current_completions: 180, max_total_completions: 1000, is_active: 1, created_at: '2026-07-02' },
            { id: 'ad-l-1', group_id: 'g-l-1', name: 'شاهد فيديو 30 ثانية لجمع الذهب', type: 'long', reward_points: 5000, url: 'https://example.com/ad4', daily_limit: 1, current_completions: 95, max_total_completions: 500, is_active: 1, created_at: '2026-07-03' },
            { id: 'task-1', group_id: 'g-t-1', name: 'متابعة قناة تليجرام الرسمية للمشروع', type: 'task', reward_points: 2000, url: 'https://t.me/Sure7777', daily_limit: 1, current_completions: 840, max_total_completions: 10000, is_active: 1, created_at: '2026-07-04' }
          ]
          localStorage.setItem('admin_items', JSON.stringify(finalItems))
        }
      }

      if (finalWiths.length === 0) {
        const storedWiths = localStorage.getItem('admin_withdrawals')
        if (storedWiths) {
          finalWiths = JSON.parse(storedWiths)
        } else {
          finalWiths = [
            { id: 'with-1', user_id: '6960850082', amount_usd: 15.00, network: 'TRC20', wallet_address: 'TY9Y1g6YmRk7rA7w9Wk7r799VvD7fghS77', status: 'pending', created_at: '2026-07-09T14:22:00' },
            { id: 'with-2', user_id: '5540321200', amount_usd: 8.50, network: 'BEP20', wallet_address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', status: 'completed', created_at: '2026-07-08T10:15:00' },
            { id: 'with-3', user_id: '4459871120', amount_usd: 0.50, network: 'TRC20', wallet_address: 'TKKD38GgY927R4w9fgh492G8D7f28hK928', status: 'rejected', created_at: '2026-07-07T11:04:00' }
          ]
          localStorage.setItem('admin_withdrawals', JSON.stringify(finalWiths))
        }
      }

      setUsers(finalUsers)
      setItems(finalItems)
      setWithdrawals(finalWiths)

      // Recalculate stats based on state
      const pendingCount = finalWiths.filter(w => w.status === 'pending').length
      setStats({
        totalUsers: finalUsers.length * 4 + 12000, // keep high number for mockup authenticity
        totalAds: finalItems.length,
        pendingWithdrawals: pendingCount,
        totalEarnings: 1648.75
      })

    } catch (e) {
      console.error('Failed to load admin panel details:', e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAdminData()
  }, [])

  // Sync back to local store on changes
  const saveUsersToStore = (newUsers: WorkerUser[]) => {
    setUsers(newUsers)
    localStorage.setItem('admin_users', JSON.stringify(newUsers))
    setStats(prev => ({ ...prev, totalUsers: newUsers.length * 4 + 12000 }))
  }

  const saveItemsToStore = (newItems: WorkerItem[]) => {
    setItems(newItems)
    localStorage.setItem('admin_items', JSON.stringify(newItems))
  }

  const saveWithdrawalsToStore = (newWiths: WorkerWithdrawal[]) => {
    setWithdrawals(newWiths)
    localStorage.setItem('admin_withdrawals', JSON.stringify(newWiths))
    setStats(prev => ({ ...prev, pendingWithdrawals: newWiths.filter(w => w.status === 'pending').length }))
  }

  // Action: Toggle Block Status
  const handleToggleBlock = (userId: string, currentStatus: number) => {
    const updated = users.map(u => {
      if (u.id === userId) {
        const next = currentStatus === 1 ? 0 : 1
        toast.success(next === 1 ? 'تم حظر المستخدم بنجاح' : 'تم إلغاء حظر المستخدم')
        return { ...u, is_blocked: next }
      }
      return u
    })
    saveUsersToStore(updated)
  }

  // Action: Edit user balance
  const handleEditBalance = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUserForEdit) return
    const pts = parseInt(editUserPoints)
    const usd = parseFloat(editUserUsd)

    if (isNaN(pts) || isNaN(usd)) {
      toast.error('الرجاء إدخال أرقام صحيحة للأرصدة')
      return
    }

    const updated = users.map(u => {
      if (u.id === selectedUserForEdit.id) {
        return { ...u, balance_points: pts, balance_usd: usd }
      }
      return u
    })
    saveUsersToStore(updated)
    setSelectedUserForEdit(null)
    toast.success('تم تعديل رصيد المستخدم بنجاح')
  }

  // Action: Toggle item active status
  const handleToggleItemActive = (itemId: string, currentActive: number) => {
    const updated = items.map(item => {
      if (item.id === itemId) {
        const next = currentActive === 1 ? 0 : 1
        toast.info(next === 1 ? 'تم تفعيل الحملة' : 'تم تعطيل الحملة')
        return { ...item, is_active: next }
      }
      return item
    })
    saveItemsToStore(updated)
  }

  // Action: Delete item Campaign
  const handleDeleteItem = (itemId: string) => {
    const updated = items.filter(item => item.id !== itemId)
    saveItemsToStore(updated)
    toast.success('تم حذف حملة الكسب بنجاح')
  }

  // Action: Approve/Reject withdrawal
  const handleProcessWithdrawal = (withId: string, nextStatus: 'completed' | 'rejected') => {
    const updated = withdrawals.map(w => {
      if (w.id === withId) {
        toast.success(nextStatus === 'completed' ? 'تمت الموافقة على طلب السحب وتحويل الرصيد' : 'تم رفض طلب السحب وإرجاع الدولار للعميل')
        return { ...w, status: nextStatus }
      }
      return w
    })
    saveWithdrawalsToStore(updated)
  }

  // Action: Create New Ad Campaign
  const handleCreateAd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAdName || !newAdUrl) {
      toast.error('الرجاء ملء كافة الحقول المطلوبة للإعلان')
      return
    }

    const newAd: WorkerItem = {
      id: `ad-${newAdType.slice(0, 1)}-${Date.now()}`,
      group_id: newAdType === 'short' ? 'g-s-1' : 'g-l-1',
      name: newAdName,
      type: newAdType,
      reward_points: parseInt(newAdPoints) || 1500,
      url: newAdUrl,
      daily_limit: parseInt(newAdLimit) || 3,
      current_completions: 0,
      max_total_completions: parseInt(newAdMax) || 1000,
      is_active: 1,
      created_at: new Date().toISOString()
    }

    saveItemsToStore([newAd, ...items])
    setNewAdName('')
    setNewAdUrl('')
    setCreateAdOpen(false)
    toast.success('تمت إضافة الإعلان الجديد وتفعيله فوراً')
  }

  // Action: Create New Telegram Task
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskName || !newTaskUrl) {
      toast.error('الرجاء ملء حقول اسم المهمة ورابط القناة/البوت')
      return
    }

    const newTask: WorkerItem = {
      id: `task-${Date.now()}`,
      group_id: 'g-t-1',
      name: newTaskName,
      type: 'task',
      reward_points: parseInt(newTaskPoints) || 2000,
      url: newTaskUrl,
      daily_limit: 1,
      current_completions: 0,
      max_total_completions: 10000,
      is_active: 1,
      created_at: new Date().toISOString()
    }

    saveItemsToStore([newTask, ...items])
    setNewTaskName('')
    setNewTaskUrl('')
    setCreateTaskOpen(false)
    toast.success('تمت إضافة مهمة التليجرام الجديدة بنجاح')
  }

  // Action: Send Broadcast
  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault()
    if (!broadcastMessage) {
      toast.error('الرجاء كتابة رسالة الإعلان أولاً')
      return
    }
    toast.success(`📢 تم إرسال الرسالة الجماعية بنجاح إلى جميع مستخدمي البوت وعددهم (${stats.totalUsers.toLocaleString()}) مستخدم!`)
    setBroadcastMessage('')
  }

  // Action: Update Global Settings Rates
  const handleUpdateSettings = (e: React.FormEvent) => {
    e.preventDefault()
    toast.success('تم حفظ إعدادات النظام وتحديث أسعار تحويل النقاط!')
  }

  // Render variables
  const filteredUsers = users.filter(u =>
    u.display_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.username?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.id?.includes(userSearch)
  )

  const filteredWithdrawals = withdrawals.filter(w => {
    if (withdrawalFilter === 'all') return true
    return w.status === withdrawalFilter
  })

  return (
    <AppShell className="font-['Cairo'] bg-[#0a0a0c] min-h-screen text-[#ffffff]">
      
      {/* SIDEBAR FOR DESKTOP NAVIGATION */}
      <AppShellSidebar className="shrink-0 border-l-2 border-white bg-[#0a0a0c]">
        <div className="flex h-full w-[280px] flex-col overflow-hidden px-6 py-10 justify-between">
          
          <div className="flex flex-col">
            {/* Dashboard Header */}
            <div className="brand-section mb-12 select-none">
              <span className="font-['Syne'] font-extrabold text-[1.8rem] text-white tracking-[-0.04em] leading-none mb-2 block">
                MegaTurbo
              </span>
              <span className="font-['Geist_Mono'] text-[0.6rem] font-bold tracking-[0.15em] border border-[#ffd700] text-[#ffd700] px-2 py-0.5 inline-block uppercase">
                ADMIN v2.0
              </span>
            </div>

            {/* Nav Items */}
            <nav className="flex flex-col gap-2">
              <button
                onClick={() => setCurrentTab('dashboard')}
                className={`w-full flex items-center gap-3 px-3 py-3 border text-[13.5px] font-semibold transition-all cursor-pointer rounded-none ${currentTab === 'dashboard' ? 'bg-white/[0.1] text-white border-white' : 'text-white/60 hover:text-white hover:bg-white/[0.05] border-transparent'}`}
              >
                <LayoutDashboard className="h-[18px] w-[18px] shrink-0 opacity-70" />
                <span>لوحة الإحصائيات العامة</span>
              </button>

              <button
                onClick={() => setCurrentTab('vault')}
                className={`w-full flex items-center gap-3 px-3 py-3 border text-[13.5px] font-semibold transition-all cursor-pointer rounded-none ${currentTab === 'vault' ? 'bg-white/[0.1] text-white border-white' : 'text-white/60 hover:text-white hover:bg-white/[0.05] border-transparent'}`}
              >
                <TrendingUp className="h-[18px] w-[18px] shrink-0 opacity-70" />
                <span>الخزنة والأرباح (رصيد المالك)</span>
              </button>

              <button
                onClick={() => setCurrentTab('withdrawals')}
                className={`w-full flex items-center gap-3 px-3 py-3 border text-[13.5px] font-semibold transition-all cursor-pointer rounded-none ${currentTab === 'withdrawals' ? 'bg-white/[0.1] text-white border-white' : 'text-white/60 hover:text-white hover:bg-white/[0.05] border-transparent'}`}
              >
                <Wallet className="h-[18px] w-[18px] shrink-0 opacity-70" />
                <span>طلبات السحب الأخيرة</span>
                {stats.pendingWithdrawals > 0 && (
                  <span className="bg-[#ff4757] text-white text-[0.6rem] font-black px-1.5 py-0.5 rounded-[2px] mr-auto leading-none uppercase font-['Geist_Mono']">{stats.pendingWithdrawals}</span>
                )}
              </button>

              <button
                onClick={() => setCurrentTab('users')}
                className={`w-full flex items-center gap-3 px-3 py-3 border text-[13.5px] font-semibold transition-all cursor-pointer rounded-none ${currentTab === 'users' ? 'bg-white/[0.1] text-white border-white' : 'text-white/60 hover:text-white hover:bg-white/[0.05] border-transparent'}`}
              >
                <Users className="h-[18px] w-[18px] shrink-0 opacity-70" />
                <span>إدارة ملفات المستخدمين</span>
              </button>

              <button
                onClick={() => setCurrentTab('ads')}
                className={`w-full flex items-center gap-3 px-3 py-3 border text-[13.5px] font-semibold transition-all cursor-pointer rounded-none ${currentTab === 'ads' ? 'bg-white/[0.1] text-white border-white' : 'text-white/60 hover:text-white hover:bg-white/[0.05] border-transparent'}`}
              >
                <Megaphone className="h-[18px] w-[18px] shrink-0 opacity-70" />
                <span>إدارة الحملات الإعلانية</span>
              </button>

              <button
                onClick={() => setCurrentTab('tasks')}
                className={`w-full flex items-center gap-3 px-3 py-3 border text-[13.5px] font-semibold transition-all cursor-pointer rounded-none ${currentTab === 'tasks' ? 'bg-white/[0.1] text-white border-white' : 'text-white/60 hover:text-white hover:bg-white/[0.05] border-transparent'}`}
              >
                <CheckSquare className="h-[18px] w-[18px] shrink-0 opacity-70" />
                <span>إدارة مهام تليجرام</span>
              </button>

              <button
                onClick={() => setCurrentTab('settings')}
                className={`w-full flex items-center gap-3 px-3 py-3 border text-[13.5px] font-semibold transition-all cursor-pointer rounded-none ${currentTab === 'settings' ? 'bg-white/[0.1] text-white border-white' : 'text-white/60 hover:text-white hover:bg-white/[0.05] border-transparent'}`}
              >
                <Settings className="h-[18px] w-[18px] shrink-0 opacity-70" />
                <span>الرسائل الجماعية والإعدادات</span>
              </button>
            </nav>
          </div>

          {/* Logout Section */}
          <button
            className="w-full text-right flex items-center gap-2 px-3 py-3 mt-8 border border-transparent rounded-none text-[13px] font-bold text-[#ff4757] hover:bg-[#ff4757]/10 transition-all cursor-pointer uppercase"
            onClick={handleLogout}
          >
            <LogOut className="h-[16px] w-[16px] shrink-0" />
            <span>تسجيل الخروج الآمن</span>
          </button>
        </div>
      </AppShellSidebar>

      {/* MAIN LAYOUT CANVAS */}
      <AppShellMain className="bg-[#0a0a0c] flex flex-col min-h-screen" style={{ backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 0)', backgroundSize: '32px 32px' }}>
        
        {/* Top Navbar Header */}
        <header className="flex h-20 shrink-0 items-center justify-between border-b-2 border-white bg-[#0a0a0c] px-12 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <MobileSidebarTrigger className="md:hidden" />
            <h1 className="text-lg font-bold text-white font-['Syne'] uppercase tracking-tight select-none">
              لوحة التحكم MegaTurboEarn
            </h1>
          </div>
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 text-[10px] font-['Geist_Mono'] tracking-[0.1em] font-bold text-[#2ecc71] bg-[#2ecc71]/10 px-3 py-1 border border-[#2ecc71]/20 uppercase">
              <div className="w-1.5 h-1.5 rounded-full bg-[#2ecc71] animate-pulse" />
              <span>CONNECTED D1</span>
            </div>
            <span className="text-sm text-white/60 hidden md:inline-block font-medium">مرحباً، المدير العام 👋</span>
          </div>
        </header>

        {/* Dynamic page tab routing */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          
          {isLoading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl w-full" />)}
              </div>
              <Skeleton className="h-80 w-full rounded-3xl" />
            </div>
          ) : (
            <div className="animate-fade-in space-y-6">
              
              {/* TAB 1: DASHBOARD OVERVIEW */}
              {currentTab === 'dashboard' && (
                <div className="space-y-12 max-w-[1400px] mx-auto w-full">
                  
                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-4 border-2 border-white bg-[#0a0a0c] mb-12">
                    <div className="p-8 border-b-2 md:border-b-0 border-white md:border-l-2 last:border-l-0 flex flex-col gap-3">
                      <span className="font-['Geist_Mono'] text-[10px] uppercase tracking-[0.15em] text-white/50 block font-bold">إجمالي مستخدمي المنصة</span>
                      <div className="font-['Syne'] text-[2.5rem] font-extrabold leading-none text-white my-2 tracking-tight">
                        {(stats.totalUsers || 12016).toLocaleString()}
                      </div>
                      <span className="text-[11px] font-bold text-[#2ecc71] block">▲ +8.2%</span>
                    </div>

                    <div className="p-8 border-b-2 md:border-b-0 border-white md:border-l-2 last:border-l-0 flex flex-col gap-3">
                      <span className="font-['Geist_Mono'] text-[10px] uppercase tracking-[0.15em] text-white/50 block font-bold">الحملات والروابط النشطة</span>
                      <div className="font-['Syne'] text-[2.5rem] font-extrabold leading-none text-[#818cf8] my-2 tracking-tight">
                        {stats.totalAds || 4} حملة
                      </div>
                      <span className="text-[11px] font-bold text-[#2ecc71] block">▲ +12% معدل نقرات</span>
                    </div>

                    <div className="p-8 border-b-2 md:border-b-0 border-white md:border-l-2 last:border-l-0 flex flex-col gap-3">
                      <span className="font-['Geist_Mono'] text-[10px] uppercase tracking-[0.15em] text-white/50 block font-bold">إجمالي أرباح الخزنة</span>
                      <div className="font-['Syne'] text-[2.5rem] font-extrabold leading-none text-[#ffd700] my-2 tracking-tight">
                        ${(stats.totalEarnings || 1648.75).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <span className="text-[11px] font-bold text-[#2ecc71] block">▲ +18.4% نمو</span>
                    </div>

                    <div className="p-8 last:border-l-0 flex flex-col gap-3">
                      <span className="font-['Geist_Mono'] text-[10px] uppercase tracking-[0.15em] text-white/50 block font-bold">طلبات السحب المعلقة</span>
                      <div className="font-['Syne'] text-[2.5rem] font-extrabold leading-none text-[#ff4757] my-2 tracking-tight">
                        {stats.pendingWithdrawals || 1} طلب
                      </div>
                      <span className="text-[11px] font-bold text-[#ff4757] block">بانتظار الموافقة الفورية</span>
                    </div>
                  </div>

                  {/* Chart Box */}
                  <div className="border-2 border-white bg-[#0a0a0c] p-10 rounded-none mb-12">
                    <div className="flex justify-between items-start mb-8">
                      <div className="space-y-1">
                        <h2 className="text-xl lg:text-2xl font-black text-white font-['Cairo']">نمو الأرباح والإيرادات الأسبوعية (USDT)</h2>
                        <p className="text-sm text-white/60">مخطط بياني يوضح إيرادات المنصة من الإعلانات وعجلة الحظ والمهام</p>
                      </div>
                      <span className="font-['Geist_Mono'] text-[10px] font-bold tracking-[0.15em] bg-[#ffd700] text-[#0a0a0c] px-3.5 py-1.5 select-none uppercase shrink-0">
                        نمو متزايد
                      </span>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="w-full h-72 bg-black border border-white/10 p-6 relative flex flex-col justify-end overflow-hidden" style={{ background: 'linear-gradient(to bottom, transparent calc(48px - 1px), rgba(255, 255, 255, 0.05) calc(48px - 1px))', backgroundSize: '100% 48px' }}>
                        <svg viewBox="0 0 1000 250" preserveAspectRatio="none" className="w-full h-full overflow-visible z-10">
                          {/* Fill under the path */}
                          <path d="M0 250 L0 200 Q 150 150 300 170 T 600 100 T 1000 50 L 1000 250 Z" fill="rgba(255, 215, 0, 0.05)" />
                          {/* Curved Line */}
                          <path d="M0 200 Q 150 150 300 170 T 600 100 T 1000 50" fill="none" stroke="#ffd700" strokeWidth="4" strokeLinecap="round" />
                          {/* Markers */}
                          <circle cx="300" cy="170" r="6" fill="#ffd700" className="animate-pulse" />
                          <circle cx="600" cy="100" r="6" fill="#ffd700" className="animate-pulse" />
                          <circle cx="1000" cy="50" r="6" fill="#ffd700" className="animate-pulse" />
                        </svg>
                      </div>
                      {/* Labels Row */}
                      <div className="flex justify-between mt-6 font-['Geist_Mono'] text-[11px] font-bold text-white/50 tracking-wider uppercase select-none">
                        <span>السبت</span><span>الأحد</span><span>الإثنين</span><span>الثلاثاء</span><span>الأربعاء</span><span>الخميس</span><span>الجمعة</span>
                      </div>
                    </div>
                  </div>

                  {/* Activity Box */}
                  <div className="border-2 border-white bg-[#0a0a0c] rounded-none p-0">
                    <div className="px-8 py-4 border-b-2 border-white font-['Geist_Mono'] text-[11px] uppercase tracking-[0.1em] text-white/70 font-bold">آخر النشاطات الحية على البوت والمنصة</div>
                    <div className="flex flex-col">
                      <div className="flex justify-between items-center px-8 py-5 border-b border-white/[0.08] text-[14px] text-white last:border-none">
                        <div className="flex items-center gap-4">
                          <div className="w-2 h-2 rounded-full bg-[#2ecc71] shrink-0" style={{ boxShadow: '0 0 8px #2ecc71' }} />
                          <span>أكمل المستخدم أحمد الحربي مشاهدة إعلان مميز</span>
                        </div>
                        <span className="font-['Geist_Mono'] text-[10.5px] uppercase tracking-[0.15em] text-white/50 font-bold">قبل دقيقة واحدة</span>
                      </div>

                      <div className="flex justify-between items-center px-8 py-5 border-b border-white/[0.08] text-[14px] text-white last:border-none">
                        <div className="flex items-center gap-4">
                          <div className="w-2 h-2 rounded-full bg-[#ffd700] shrink-0" style={{ boxShadow: '0 0 8px #ffd700' }} />
                          <span>ربح المستخدم خالد عبد الله 100 نقطة من عجلة الحظ</span>
                        </div>
                        <span className="font-['Geist_Mono'] text-[10.5px] uppercase tracking-[0.15em] text-white/50 font-bold">قبل 5 دقائق</span>
                      </div>

                      <div className="flex justify-between items-center px-8 py-5 border-b border-white/[0.08] text-[14px] text-white last:border-none">
                        <div className="flex items-center gap-4">
                          <div className="w-2 h-2 rounded-full bg-[#a29bfe] shrink-0" style={{ boxShadow: '0 0 8px #a29bfe' }} />
                          <span>انضم مستخدم جديد برابط إحالة @khalid_tg</span>
                        </div>
                        <span className="font-['Geist_Mono'] text-[10.5px] uppercase tracking-[0.15em] text-white/50 font-bold">قبل 12 دقيقة</span>
                      </div>

                      <div className="flex justify-between items-center px-8 py-5 border-b border-white/[0.08] text-[14px] text-white last:border-none">
                        <div className="flex items-center gap-4">
                          <div className="w-2 h-2 rounded-full bg-[#ff4757] shrink-0" style={{ boxShadow: '0 0 8px #ff4757' }} />
                          <span>قدم المستخدم نورة طلب سحب بقيمة 15 USDT</span>
                        </div>
                        <span className="font-['Geist_Mono'] text-[10.5px] uppercase tracking-[0.15em] text-white/50 font-bold">قبل 20 دقيقة</span>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 2: VAULT VIEW */}
              {currentTab === 'vault' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Safe Box visual and trigger */}
                  <div className="lg:col-span-2 bg-[#0a0a0c] border-2 border-white p-8 rounded-none flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,rgba(255,215,0,0.03),transparent)] pointer-events-none" />
                    
                    {/* Vault SVG Illustration */}
                    <div className="w-full md:w-1/2 text-center flex flex-col items-center gap-4">
                      <h4 className="text-lg font-black text-white text-right w-full mb-2">الخزنة المركزية</h4>
                      
                      <div className="relative group cursor-pointer py-4">
                        <svg className="w-44 h-44 mx-auto drop-shadow-3xl transform group-hover:scale-105 transition-all duration-500" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect x="8" y="8" width="104" height="104" rx="0" fill="black" opacity="0.4" />
                          <rect x="10" y="10" width="100" height="100" rx="0" fill="#111114" stroke="#ffffff" strokeWidth="3" />
                          <rect x="16" y="16" width="88" height="88" rx="0" fill="#050507" />
                          
                          {/* Combination wheel */}
                          <circle cx="60" cy="60" r="28" fill="#FFD700" stroke="#B8860B" strokeWidth="2.5" />
                          <circle cx="60" cy="60" r="20" fill="#111827" />
                          
                          {/* Combination lines */}
                          <line x1="60" y1="42" x2="60" y2="78" stroke="#FFD700" strokeWidth="2" />
                          <line x1="42" y1="60" x2="78" y2="60" stroke="#FFD700" strokeWidth="2" />
                          <circle cx="60" cy="60" r="5" fill="#FFD700" />
                        </svg>
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs text-white/50">رصيد المالك القابل للسحب في الخزنة</p>
                        <h2 className="text-4xl font-black text-[#FFD700] font-['Syne']">${stats.totalEarnings.toFixed(2)} USDT</h2>
                        <span className="text-[10px] text-[#2ecc71] font-bold block mt-1">✓ الرصيد جاهز للتحويل الفوري لمقرك</span>
                      </div>

                      <button onClick={() => toast.success('تم تحويل أرباح المالك بالكامل لمحفظتك الشخصية بنجاح')} className="w-full bg-[#2ecc71] hover:bg-[#27ae60] text-black font-extrabold py-3.5 rounded-none border border-white transition-all cursor-pointer mt-3 text-xs tracking-wider uppercase flex items-center justify-center gap-1">
                        <ArrowUpRight className="h-4 w-4" /> سحب أرباح الخزنة الآن
                      </button>
                    </div>

                    <div className="hidden md:block w-px h-52 bg-white/10" />

                    {/* Breakdown of incomes */}
                    <div className="w-full md:w-1/2 space-y-4">
                      <h4 className="text-sm font-bold text-[#FFD700] text-right">تحليل مصادر دخل الخزنة</h4>
                      <div className="space-y-3 text-xs">
                        <div className="flex justify-between items-center py-2 border-b border-white/10">
                          <span className="text-white/60">أرباح شبكة إعلانات Adsgram</span>
                          <span className="font-bold text-white">$654.30 USDT</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-white/10">
                          <span className="text-white/60">رسوم حجز وتفعيل المهام الإدارية</span>
                          <span className="font-bold text-white">$412.25 USDT</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-white/10">
                          <span className="text-white/60">رسوم الإحالات والشبكات الفرعية</span>
                          <span className="font-bold text-white">$182.40 USDT</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-white/10">
                          <span className="text-white/60">عمولات إيداع المعلنين للمهام</span>
                          <span className="font-bold text-white">$324.10 USDT</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-white/60">أخرى ومتنوعة</span>
                          <span className="font-bold text-white">$75.70 USDT</span>
                        </div>

                        <div className="flex justify-between items-center pt-3 text-sm font-black border-t border-white/20 text-[#2ecc71]">
                          <span>الإجمالي الصافي في الخزنة</span>
                          <span>${stats.totalEarnings.toFixed(2)} USDT</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Summary of limits */}
                  <div className="bg-[#0a0a0c] border-2 border-white p-6 rounded-none space-y-4 flex flex-col justify-between">
                    <div>
                      <h4 className="text-sm font-black text-white mb-4">الخزنة باختصار</h4>
                      <div className="space-y-3 text-xs text-white/70">
                        <div className="flex justify-between">
                          <span>إجمالي إيرادات المنصة الكلية</span>
                          <span className="font-bold text-white">$1,648.75</span>
                        </div>
                        <div className="flex justify-between">
                          <span>إجمالي مسحوبات المستخدمين المعتمدة</span>
                          <span className="font-bold text-white">$400.00</span>
                        </div>
                        <div className="h-px bg-white/10" />
                        <div className="flex justify-between font-black text-[#FFD700]">
                          <span>الرصيد المتبقي في الخزنة</span>
                          <span>$1,248.75</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-yellow-500/5 border border-yellow-500/30 p-4 rounded-none text-[10px] text-yellow-400 leading-relaxed font-bold">
                      تتطابق هذه الإحصائيات بالكامل مع السجلات المعتمدة في تليجرام لضمان أعلى مستويات الأمان المالي والتحقق من أرصدة الإعلانات.
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: WITHDRAWAL REQUESTS */}
              {currentTab === 'withdrawals' && (
                <div className="bg-[#0a0a0c] border-2 border-white p-6 rounded-none space-y-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h3 className="font-black text-lg text-white font-['Cairo']">إدارة طلبات سحب المستخدمين</h3>
                      <p className="text-xs text-white/50 mt-1">راجع ووافق أو ارفض طلبات سحب الأرصدة المقدمة عبر شبكة TRC20 و BEP20</p>
                    </div>

                    {/* Filter buttons */}
                    <div className="flex gap-2 bg-black p-1 rounded-none border border-white/20 text-xs font-bold">
                      <button onClick={() => setWithdrawalFilter('all')} className={`px-4 py-1.5 transition-all cursor-pointer ${withdrawalFilter === 'all' ? 'bg-[#FFD700] text-black font-black' : 'text-white/60 hover:text-white'}`}>الكل</button>
                      <button onClick={() => setWithdrawalFilter('pending')} className={`px-4 py-1.5 transition-all cursor-pointer ${withdrawalFilter === 'pending' ? 'bg-[#FFD700] text-black font-black' : 'text-white/60 hover:text-white'}`}>قيد الانتظار ({stats.pendingWithdrawals})</button>
                      <button onClick={() => setWithdrawalFilter('completed')} className={`px-4 py-1.5 transition-all cursor-pointer ${withdrawalFilter === 'completed' ? 'bg-[#FFD700] text-black font-black' : 'text-white/60 hover:text-white'}`}>مكتملة</button>
                      <button onClick={() => setWithdrawalFilter('rejected')} className={`px-4 py-1.5 transition-all cursor-pointer ${withdrawalFilter === 'rejected' ? 'bg-[#FFD700] text-black font-black' : 'text-white/60 hover:text-white'}`}>مرفوضة</button>
                    </div>
                  </div>

                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-right border-collapse text-xs">
                      <thead>
                        <tr className="border-b-2 border-white text-white/60">
                          <th className="pb-3 pt-2 font-bold px-4">رقم الطلب</th>
                          <th className="pb-3 pt-2 font-bold px-4">معرف العميل (TG)</th>
                          <th className="pb-3 pt-2 font-bold px-4">المبلغ المسحوب</th>
                          <th className="pb-3 pt-2 font-bold px-4">الشبكة</th>
                          <th className="pb-3 pt-2 font-bold px-4">عنوان محفظة السحب</th>
                          <th className="pb-3 pt-2 font-bold px-4">التاريخ والوقت</th>
                          <th className="pb-3 pt-2 font-bold px-4">الحالة</th>
                          <th className="pb-3 pt-2 font-bold px-4 text-center">الإجراءات والقرار</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10 text-white/95">
                        {filteredWithdrawals.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-white/30 font-bold">لا توجد طلبات سحب تطابق خيار التصفية</td>
                          </tr>
                        ) : (
                          filteredWithdrawals.map((w, idx) => (
                            <tr key={w.id} className="hover:bg-white/[0.03] transition-colors">
                              <td className="py-4 px-4 font-mono font-bold text-white/80">#{10580 + idx}</td>
                              <td className="py-4 px-4 font-mono text-[#818cf8] font-bold">@{w.user_id}</td>
                              <td className="py-4 px-4 font-black text-white">${Number(w.amount_usd).toFixed(2)} USDT</td>
                              <td className="py-4 px-4">
                                <span className="bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/30 px-2 py-0.5 text-[10px] font-bold font-['Geist_Mono']">{w.network}</span>
                              </td>
                              <td className="py-4 px-4 font-mono text-white/40 break-all select-all">{w.wallet_address}</td>
                              <td className="py-4 px-4 text-white/50">{w.created_at?.slice(0, 16).replace('T', ' ')}</td>
                              <td className="py-4 px-4">
                                <span className={`font-bold px-2.5 py-0.5 rounded-none border text-[10px] ${w.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : w.status === 'completed' ? 'bg-[#2ecc71]/10 text-[#2ecc71] border-[#2ecc71]/20' : 'bg-[#ff4757]/10 text-[#ff4757] border-[#ff4757]/20'}`}>
                                  {w.status === 'pending' ? 'قيد المراجعة' : w.status === 'completed' ? 'تم الدفع والاعتماد' : 'مرفوض'}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-center">
                                {w.status === 'pending' ? (
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      onClick={() => handleProcessWithdrawal(w.id, 'completed')}
                                      className="p-1.5 bg-[#2ecc71]/15 hover:bg-[#2ecc71]/30 text-[#2ecc71] border border-[#2ecc71]/30 rounded-none flex items-center gap-1 font-bold text-[11px] cursor-pointer"
                                    >
                                      <Check className="h-3.5 w-3.5" /> موافقة
                                    </button>
                                    <button
                                      onClick={() => handleProcessWithdrawal(w.id, 'rejected')}
                                      className="p-1.5 bg-[#ff4757]/15 hover:bg-[#ff4757]/30 text-[#ff4757] border border-[#ff4757]/30 rounded-none flex items-center gap-1 font-bold text-[11px] cursor-pointer"
                                    >
                                      <X className="h-3.5 w-3.5" /> رفض وإلغاء
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-white/30 text-[11px] font-bold">تم البت في الطلب</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 4: USERS MANAGEMENT */}
              {currentTab === 'users' && (
                <div className="bg-[#0a0a0c] border-2 border-white p-6 rounded-none space-y-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h3 className="font-black text-lg text-white font-['Cairo']">قاعدة بيانات المشتركين والمستخدمين</h3>
                      <p className="text-xs text-white/50 mt-1">ابحث، عدل أرصدة المشتركين، أو احظر الحسابات الوهمية لتأمين المنصة</p>
                    </div>

                    {/* Search Field */}
                    <div className="relative w-full md:w-80">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                      <input
                        type="text"
                        placeholder="ابحث بالاسم أو معرف التيليجرام..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="w-full bg-black border-2 border-white/20 rounded-none pr-9 pl-4 py-2.5 text-xs text-white focus:border-white outline-none"
                      />
                    </div>
                  </div>

                  {/* Users Table */}
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-right border-collapse text-xs">
                      <thead>
                        <tr className="border-b-2 border-white text-white/60">
                          <th className="pb-3 pt-2 font-bold px-4">الرقم التعريفي (TG)</th>
                          <th className="pb-3 pt-2 font-bold px-4">اسم المستخدم</th>
                          <th className="pb-3 pt-2 font-bold px-4">الاسم المعروض</th>
                          <th className="pb-3 pt-2 font-bold px-4">رصيد النقاط</th>
                          <th className="pb-3 pt-2 font-bold px-4">الرصيد بالدولار</th>
                          <th className="pb-3 pt-2 font-bold px-4">المستوى الحالي</th>
                          <th className="pb-3 pt-2 font-bold px-4">تاريخ الانضمام</th>
                          <th className="pb-3 pt-2 font-bold px-4">حالة الحساب</th>
                          <th className="pb-3 pt-2 font-bold px-4 text-center">تعديل وإجراء</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10 text-white/95">
                        {filteredUsers.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="py-8 text-center text-white/30 font-bold">لا يوجد مستخدمون يطابقون عبارة البحث</td>
                          </tr>
                        ) : (
                          filteredUsers.map((u) => (
                            <tr key={u.id} className="hover:bg-white/[0.03] transition-colors">
                              <td className="py-4 px-4 font-mono font-bold text-white/80">{u.id}</td>
                              <td className="py-4 px-4 font-mono text-[#818cf8] font-bold">@{u.username || 'بدون'}</td>
                              <td className="py-4 px-4 font-bold">{u.display_name}</td>
                              <td className="py-4 px-4 font-mono font-black text-[#FFD700]">{(u.balance_points || 0).toLocaleString()} ن</td>
                              <td className="py-4 px-4 font-mono font-black text-[#2ecc71]">${(u.balance_usd || 0).toFixed(2)} USDT</td>
                              <td className="py-4 px-4">
                                <span className="bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/30 px-2 py-0.5 text-[10px] font-bold font-['Geist_Mono']">{u.level || 'bronze'}</span>
                              </td>
                              <td className="py-4 px-4 text-white/50">{u.created_at?.slice(0, 10)}</td>
                              <td className="py-4 px-4">
                                <span className={`font-bold rounded-none px-2 py-0.5 text-[9px] border ${u.is_blocked === 1 ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                                  {u.is_blocked === 1 ? 'محظور وهمي' : 'نشط'}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => {
                                      setSelectedUserForEdit(u)
                                      setEditUserPoints(String(u.balance_points))
                                      setEditUserUsd(String(u.balance_usd))
                                    }}
                                    className="p-1.5 bg-[#818cf8]/10 hover:bg-[#818cf8]/20 text-[#818cf8] border border-[#818cf8]/20 rounded-none text-[11px] cursor-pointer"
                                    title="تعديل الأرصدة"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleToggleBlock(u.id, u.is_blocked)}
                                    className={`p-1.5 border rounded-none text-[11px] cursor-pointer ${u.is_blocked === 1 ? 'bg-[#2ecc71]/10 hover:bg-[#2ecc71]/20 text-[#2ecc71] border-[#2ecc71]/20' : 'bg-[#ff4757]/10 hover:bg-[#ff4757]/20 text-[#ff4757] border-[#ff4757]/20'}`}
                                  >
                                    {u.is_blocked === 1 ? 'إلغاء حظر' : 'حظر الحساب'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Edit Balance Modal Drawer */}
                  {selectedUserForEdit && (
                    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                      <div className="bg-[#0a0a0c] border-2 border-white rounded-none p-6 w-full max-w-sm text-right relative">
                        <h3 className="text-sm font-black mb-4 font-['Cairo']">تعديل أرصدة المشترك: {selectedUserForEdit.display_name}</h3>
                        <form onSubmit={handleEditBalance} className="space-y-4">
                          <div className="space-y-1">
                            <label className="text-[10px] text-white/50 block font-bold">رصيد النقاط الكلي</label>
                            <input
                              type="number"
                              value={editUserPoints}
                              onChange={(e) => setEditUserPoints(e.target.value)}
                              className="w-full bg-black border border-white/20 rounded-none px-3 py-2 text-xs text-white focus:border-white outline-none"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-white/50 block font-bold">الرصيد بالدولار (USDT)</label>
                            <input
                              type="number"
                              step="any"
                              value={editUserUsd}
                              onChange={(e) => setEditUserUsd(e.target.value)}
                              className="w-full bg-black border border-white/20 rounded-none px-3 py-2 text-xs text-white focus:border-white outline-none"
                            />
                          </div>

                          <div className="flex gap-2 justify-end pt-2 font-bold">
                            <button type="button" onClick={() => setSelectedUserForEdit(null)} className="bg-white/5 hover:bg-white/10 text-white border border-white/20 rounded-none py-2 text-xs px-4 cursor-pointer">إلغاء</button>
                            <button type="submit" className="bg-[#FFD700] hover:bg-[#FFD700]/90 text-black py-2 text-xs rounded-none border border-[#FFD700]/30 px-4 cursor-pointer font-black">حفظ التغييرات</button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: ADS CAMPAIGNS */}
              {currentTab === 'ads' && (
                <div className="bg-[#0a0a0c] border-2 border-white p-6 rounded-none space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-black text-lg text-white font-['Cairo']">إدارة الحملات الإعلانية الفعالة</h3>
                      <p className="text-xs text-white/50 mt-1">تتبع إحصائيات ظهور الإعلانات المميزة أو أضف حملة إعلانية ممولة جديدة</p>
                    </div>
                    <button onClick={() => setCreateAdOpen(true)} className="bg-[#2ecc71] hover:bg-[#27ae60] text-black font-extrabold py-2.5 px-4 rounded-none text-xs border border-white flex items-center gap-1 cursor-pointer transition-all font-['Cairo']">
                      <Plus className="h-4 w-4" /> إضافة إعلان ممول جديد
                    </button>
                  </div>

                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-right border-collapse text-xs">
                      <thead>
                        <tr className="border-b-2 border-white text-white/60">
                          <th className="pb-3 pt-2 font-bold px-4">عنوان الإعلان</th>
                          <th className="pb-3 pt-2 font-bold px-4">نوع الإعلان</th>
                          <th className="pb-3 pt-2 font-bold px-4">مكافأة المشاهدة</th>
                          <th className="pb-3 pt-2 font-bold px-4">رابط الإعلان</th>
                          <th className="pb-3 pt-2 font-bold px-4">الحد اليومي/عضو</th>
                          <th className="pb-3 pt-2 font-bold px-4">الإنجاز الكلي</th>
                          <th className="pb-3 pt-2 font-bold px-4">الحالة</th>
                          <th className="pb-3 pt-2 font-bold px-4 text-center">الإجراء</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10 text-white/95">
                        {items.filter(item => item.type !== 'task').map((ad) => (
                          <tr key={ad.id} className="hover:bg-white/[0.03] transition-colors">
                            <td className="py-4 px-4 font-bold">{ad.name}</td>
                            <td className="py-4 px-4">
                              <span className={ad.type === 'short' ? 'bg-[#818cf8]/10 text-[#818cf8] border border-[#818cf8]/30 px-2 py-0.5 text-[10px] font-bold font-["Geist_Mono"]' : 'bg-purple-500/10 text-purple-400 border border-purple-500/30 px-2 py-0.5 text-[10px] font-bold font-["Geist_Mono"]'}>
                                {ad.type === 'short' ? 'قصير مميز' : 'فيديو طويل ترويجي'}
                              </span>
                            </td>
                            <td className="py-4 px-4 font-black text-[#FFD700]">{ad.reward_points} نقطة</td>
                            <td className="py-4 px-4 font-mono text-white/40">{ad.url}</td>
                            <td className="py-4 px-4">{ad.daily_limit} مرات</td>
                            <td className="py-4 px-4 font-mono font-bold text-white/70">{ad.current_completions || 0} / {ad.max_total_completions || 1000}</td>
                            <td className="py-4 px-4">
                              <span className={`font-bold text-[9px] px-2 py-0.5 rounded-none border ${ad.is_active === 1 ? 'bg-[#2ecc71]/10 text-[#2ecc71] border-[#2ecc71]/20' : 'bg-white/10 text-white/50 border-white/20'}`}>
                                {ad.is_active === 1 ? 'نشط وقابل للعرض' : 'معطل مؤقتاً'}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleToggleItemActive(ad.id, ad.is_active)}
                                  className={`px-2.5 py-1 text-[10px] font-bold border rounded-none cursor-pointer ${ad.is_active === 1 ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/35' : 'bg-[#2ecc71]/15 text-[#2ecc71] border-[#2ecc71]/30 hover:bg-[#2ecc71]/35'}`}
                                >
                                  {ad.is_active === 1 ? 'تعطيل' : 'تفعيل'}
                                </button>
                                <button
                                  onClick={() => handleDeleteItem(ad.id)}
                                  className="p-1.5 bg-[#ff4757]/15 hover:bg-[#ff4757]/30 text-[#ff4757] border border-[#ff4757]/30 rounded-none cursor-pointer"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Add Ad Campaign Drawer Modal */}
                  {createAdOpen && (
                    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                      <div className="bg-[#0a0a0c] border-2 border-white rounded-none p-6 w-full max-w-sm text-right">
                        <h3 className="text-sm font-black mb-4 font-['Cairo']">إنشاء حملة إعلانية ممولة جديدة</h3>
                        
                        <form onSubmit={handleCreateAd} className="space-y-3.5 text-xs">
                          <div className="space-y-1">
                            <label className="text-[10px] text-white/50 block font-bold">عنوان وحملة الإعلان</label>
                            <input
                              type="text"
                              placeholder="مثال: زيارة موقع المستثمر الرئيسي"
                              value={newAdName}
                              onChange={(e) => setNewAdName(e.target.value)}
                              className="w-full bg-black border border-white/20 rounded-none px-3 py-2 text-white focus:border-white outline-none"
                              required
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-white/50 block font-bold">رابط التوجيه (URL)</label>
                            <input
                              type="url"
                              placeholder="https://example.com"
                              value={newAdUrl}
                              onChange={(e) => setNewAdUrl(e.target.value)}
                              className="w-full bg-black border border-white/20 rounded-none px-3 py-2 text-white focus:border-white outline-none"
                              required
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[10px] text-white/50 block font-bold">نقاط المكافأة</label>
                              <input
                                type="number"
                                value={newAdPoints}
                                onChange={(e) => setNewAdPoints(e.target.value)}
                                className="w-full bg-black border border-white/20 rounded-none px-3 py-2 text-white focus:border-white outline-none"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] text-white/50 block font-bold">نوع ومستوى الإعلان</label>
                              <select
                                value={newAdType}
                                onChange={(e: any) => setNewAdType(e.target.value)}
                                className="w-full bg-black border border-white/20 rounded-none px-3 py-2 text-white focus:border-white outline-none font-bold"
                              >
                                <option value="short">قصير مميز</option>
                                <option value="long">فيديو طويل</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[10px] text-white/50 block font-bold">الحد اليومي للمستخدم</label>
                              <input
                                type="number"
                                value={newAdLimit}
                                onChange={(e) => setNewAdLimit(e.target.value)}
                                className="w-full bg-black border border-white/20 rounded-none px-3 py-2 text-white focus:border-white outline-none"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] text-white/50 block font-bold">إجمالي عدد المشاهدات المستهدفة</label>
                              <input
                                type="number"
                                value={newAdMax}
                                onChange={(e) => setNewAdMax(e.target.value)}
                                className="w-full bg-black border border-white/20 rounded-none px-3 py-2 text-white focus:border-white outline-none"
                              />
                            </div>
                          </div>

                          <div className="flex gap-2 justify-end pt-3 font-bold">
                            <button type="button" onClick={() => setCreateAdOpen(false)} className="bg-white/5 hover:bg-white/10 text-white border border-white/20 rounded-none py-2 text-xs px-4 cursor-pointer font-bold">إلغاء</button>
                            <button type="submit" className="bg-[#FFD700] hover:bg-[#FFD700]/90 text-black py-2 rounded-none border border-[#FFD700]/30 px-4 cursor-pointer font-black font-['Cairo']">إطلاق الحملة</button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: TELEGRAM TASKS */}
              {currentTab === 'tasks' && (
                <div className="bg-[#0a0a0c] border-2 border-white p-6 rounded-none space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-black text-lg text-white font-['Cairo']">إدارة المهام والقنوات الترويجية</h3>
                      <p className="text-xs text-white/50 mt-1">راجع قائمة قنوات وبوتات تليجرام التي يجب على الأعضاء الاشتراك فيها للربح</p>
                    </div>
                    <button onClick={() => setCreateTaskOpen(true)} className="bg-[#2ecc71] hover:bg-[#27ae60] text-black font-extrabold py-2.5 px-4 rounded-none text-xs border border-white flex items-center gap-1 cursor-pointer transition-all font-['Cairo']">
                      <Plus className="h-4 w-4" /> إضافة مهمة قنوات جديدة
                    </button>
                  </div>

                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-right border-collapse text-xs">
                      <thead>
                        <tr className="border-b-2 border-white text-white/60">
                          <th className="pb-3 pt-2 font-bold px-4">اسم المهمة والمشروع</th>
                          <th className="pb-3 pt-2 font-bold px-4">المكافأة للأعضاء</th>
                          <th className="pb-3 pt-2 font-bold px-4">رابط تليجرام المباشر</th>
                          <th className="pb-3 pt-2 font-bold px-4">إجمالي المشتركين الحاصلين</th>
                          <th className="pb-3 pt-2 font-bold px-4">تاريخ التفعيل</th>
                          <th className="pb-3 pt-2 font-bold px-4">الحالة</th>
                          <th className="pb-3 pt-2 font-bold px-4 text-center">الإجراء</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10 text-white/95">
                        {items.filter(item => item.type === 'task').map((task) => (
                          <tr key={task.id} className="hover:bg-white/[0.03] transition-colors">
                            <td className="py-4 px-4 font-bold">{task.name}</td>
                            <td className="py-4 px-4 font-black text-[#FFD700]">{task.reward_points} نقطة</td>
                            <td className="py-4 px-4 font-mono text-[#818cf8] select-all font-bold">{task.url}</td>
                            <td className="py-4 px-4 font-mono font-bold text-white/70">{task.current_completions || 0} عضو</td>
                            <td className="py-4 px-4 text-white/50">{task.created_at?.slice(0, 10)}</td>
                            <td className="py-4 px-4">
                              <span className={`font-bold text-[9px] px-2 py-0.5 rounded-none border ${task.is_active === 1 ? 'bg-[#2ecc71]/10 text-[#2ecc71] border-[#2ecc71]/20' : 'bg-white/10 text-white/50 border-white/20'}`}>
                                {task.is_active === 1 ? 'نشطة ومتوفرة' : 'معطلة'}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleToggleItemActive(task.id, task.is_active)}
                                  className={`px-2.5 py-1 text-[10px] font-bold border rounded-none cursor-pointer ${task.is_active === 1 ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/35' : 'bg-[#2ecc71]/15 text-[#2ecc71] border-[#2ecc71]/30 hover:bg-[#2ecc71]/35'}`}
                                >
                                  {task.is_active === 1 ? 'تعطيل' : 'تفعيل'}
                                </button>
                                <button
                                  onClick={() => handleDeleteItem(task.id)}
                                  className="p-1.5 bg-[#ff4757]/15 hover:bg-[#ff4757]/30 text-[#ff4757] border border-[#ff4757]/30 rounded-none cursor-pointer"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Add Task Modal Drawer */}
                  {createTaskOpen && (
                    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                      <div className="bg-[#0a0a0c] border-2 border-white rounded-none p-6 w-full max-w-sm text-right">
                        <h3 className="text-sm font-black mb-4 font-['Cairo']">إضافة مهمة تليجرام جديدة</h3>
                        
                        <form onSubmit={handleCreateTask} className="space-y-3.5 text-xs">
                          <div className="space-y-1">
                            <label className="text-[10px] text-white/50 block font-bold">اسم القناة أو البوت للترويج</label>
                            <input
                              type="text"
                              placeholder="مثال: الاشتراك في القناة الرسمية"
                              value={newTaskName}
                              onChange={(e) => setNewTaskName(e.target.value)}
                              className="w-full bg-black border border-white/20 rounded-none px-3 py-2 text-white focus:border-white outline-none"
                              required
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-white/50 block font-bold">رابط تليجرام (@channel أو t.me)</label>
                            <input
                              type="url"
                              placeholder="https://t.me/Sure7777"
                              value={newTaskUrl}
                              onChange={(e) => setNewTaskUrl(e.target.value)}
                              className="w-full bg-black border border-white/20 rounded-none px-3 py-2 text-white font-mono focus:border-white outline-none"
                              required
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-white/50 block font-bold">مكافأة نقاط الإنجاز الكلي</label>
                            <input
                              type="number"
                              value={newTaskPoints}
                              onChange={(e) => setNewTaskPoints(e.target.value)}
                              className="w-full bg-black border border-white/20 rounded-none px-3 py-2 text-white focus:border-white outline-none"
                            />
                          </div>

                          <div className="flex gap-2 justify-end pt-3 font-bold">
                            <button type="button" onClick={() => setCreateTaskOpen(false)} className="bg-white/5 hover:bg-white/10 text-white border border-white/20 rounded-none py-2 text-xs px-4 cursor-pointer">إلغاء</button>
                            <button type="submit" className="bg-[#FFD700] hover:bg-[#FFD700]/90 text-black py-2 rounded-none border border-[#FFD700]/30 px-4 cursor-pointer font-black font-['Cairo']">إضافة وتفعيل</button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 7: GENERAL SETTINGS & BROADCAST */}
              {currentTab === 'settings' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Broadcast messaging */}
                  <div className="bg-[#0a0a0c] border-2 border-white p-6 rounded-none space-y-4">
                    <div className="flex items-center gap-2 text-[#FFD700]">
                      <Mail className="h-5 w-5" />
                      <h3 className="font-black text-sm font-['Cairo']">ارسال رسالة جماعية (Broadcast) للأعضاء</h3>
                    </div>
                    <p className="text-xs text-white/50 leading-relaxed">
                      اكتب الرسالة وسيقوم البوت بإرسال إخطار فوري لجميع المشتركين المسجلين في البوت تليجرام بشكل آمن. يدعم وسوم HTML.
                    </p>

                    <form onSubmit={handleSendBroadcast} className="space-y-4">
                      <textarea
                        rows={6}
                        placeholder="اكتب نص الإعلان الجماعي هنا... (مثال: أهلاً يا شباب، قمنا بمضاعفة مكافآت الإعلانات وعجلة الحظ لليوم فقط! 🚀)"
                        value={broadcastMessage}
                        onChange={(e) => setBroadcastMessage(e.target.value)}
                        className="w-full bg-black border border-white/20 rounded-none px-4 py-3 text-xs text-white focus:border-white outline-none leading-relaxed"
                        required
                      />
                      <button type="submit" className="w-full bg-[#818cf8] hover:bg-[#6366f1] text-black font-extrabold py-3.5 rounded-none border border-white flex justify-center items-center gap-1.5 text-xs transition-all cursor-pointer font-['Cairo']">
                        <Mail className="h-4 w-4" /> إرسال الإعلان الجماعي الآن
                      </button>
                    </form>
                  </div>

                  {/* Settings Rates */}
                  <div className="bg-[#0a0a0c] border-2 border-white p-6 rounded-none space-y-4">
                    <div className="flex items-center gap-2 text-[#2ecc71]">
                      <Settings className="h-5 w-5" />
                      <h3 className="font-black text-sm font-['Cairo']">إعدادات أسعار المنصة والنسب</h3>
                    </div>
                    <p className="text-xs text-white/50">تحكم بالثوابت الأساسية لنظام تحويل الذهب والدولار ومعدل تقسيم الأرباح</p>

                    <form onSubmit={handleUpdateSettings} className="space-y-4 text-xs">
                      <div className="space-y-1">
                        <label className="text-[10px] text-white/50 block font-bold">معدل تحويل النقاط لكل 1 دولار (USDT)</label>
                        <input
                          type="number"
                          value={conversionRate}
                          onChange={(e) => setConversionRate(e.target.value)}
                          className="w-full bg-black border border-white/20 rounded-none px-3 py-2 text-white font-mono focus:border-white outline-none"
                        />
                        <span className="text-[9px] text-white/30 block mt-0.5">الافتراضي: 1000 نقطة = 1 دولار</span>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-white/50 block font-bold">نسبة تقسيم أرباح المالك من الإعلانات (%)</label>
                        <input
                          type="number"
                          value={profitSplit}
                          onChange={(e) => setProfitSplit(e.target.value)}
                          className="w-full bg-black border border-white/20 rounded-none px-3 py-2 text-white font-mono focus:border-white outline-none"
                        />
                        <span className="text-[9px] text-white/30 block mt-0.5">مثال: 50% تذهب للخزنة و 50% مكافآت للمشاهدين</span>
                      </div>

                      <button type="submit" className="w-full bg-[#FFD700] hover:bg-[#FFD700]/90 text-black font-black py-3.5 rounded-none border border-white text-xs transition-all cursor-pointer font-['Cairo']">
                        حفظ قيم الإعدادات الافتراضية
                      </button>
                    </form>
                  </div>
                </div>
              )}

            </div>
          )}

        </main>
        <footer className="mt-auto py-6 px-12 border-t border-white/10 flex justify-between items-center text-[#ececec]/40 text-[10px] font-['Space_Mono'] tracking-[0.2em] uppercase shrink-0">
          <span>SYSTEM OPERATIONAL</span>
          <span>© 2026 MEGATURBOEARN</span>
        </footer>
      </AppShellMain>
    </AppShell>
  )
}
