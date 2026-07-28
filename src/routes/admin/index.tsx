import { createFileRoute } from '@tanstack/react-router'
import { Page, PageHeader, PageTitle, StatGroup, Stat, Card, CardHeader, CardTitle, CardContent, Skeleton, AreaChart, BarChart } from '@blinkdotnew/ui'
import { Users, Megaphone, Wallet, DollarSign, TrendingUp, UserPlus } from 'lucide-react'
import { useDashboardStats } from '@/lib/api'
import { workerAdminApi } from '@/lib/worker-admin-api'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useQuery } from '@tanstack/react-query'

export const Route = createFileRoute('/admin/')({
  component: () => (
    <ErrorBoundary>
      <DashboardPage />
    </ErrorBoundary>
  ),
})

const chartData = [
  { name: 'السبت', value: 400 },
  { name: 'الأحد', value: 300 },
  { name: 'الاثنين', value: 600 },
  { name: 'الثلاثاء', value: 800 },
  { name: 'الأربعاء', value: 500 },
  { name: 'الخميس', value: 900 },
  { name: 'الجمعة', value: 700 },
]

function DashboardPage() {
  const { data: blinkStats, isLoading: blinkLoading } = useDashboardStats()

  // Fetch stats from the live worker API (works on both sandbox and production)
  const { data: workerStats, isLoading: workerLoading } = useQuery({
    queryKey: ['worker', 'stats'],
    queryFn: () => workerAdminApi.getStats(),
    refetchInterval: 30_000,
  })

  const isLoading = blinkLoading && workerLoading

  // Merge: prefer worker stats (live DB), fall back to Blink SDK stats (sandbox preview)
  const stats = {
    totalUsers: workerStats?.totalUsers ?? blinkStats?.totalUsers ?? 0,
    totalAds: workerStats?.totalAds ?? blinkStats?.totalAds ?? 0,
    pendingWithdrawals: workerStats?.pendingWithdrawals ?? blinkStats?.pendingWithdrawals ?? 0,
    totalTransactions: blinkStats?.totalTransactions ?? 0,
    totalReferrals: blinkStats?.totalReferrals ?? 0,
  }

  const StatSkeleton = () => <Skeleton className="h-[88px] w-full rounded-xl" />

  return (
    <Page>
      <PageHeader>
        <PageTitle>لوحة الإحصائيات</PageTitle>
      </PageHeader>

      <div className="space-y-8">
        <StatGroup>
          {isLoading ? (
            <><StatSkeleton /><StatSkeleton /><StatSkeleton /><StatSkeleton /></>
          ) : (
            <>
              <Stat label="المستخدمين" value={stats.totalUsers} icon={<Users className="h-5 w-5" />} />
              <Stat label="الإعلانات" value={stats.totalAds} icon={<Megaphone className="h-5 w-5" />} />
              <Stat label="طلبات السحب" value={stats.pendingWithdrawals} icon={<Wallet className="h-5 w-5" />} />
              <Stat label="الإحالات" value={stats.totalReferrals} icon={<UserPlus className="h-5 w-5" />} />
            </>
          )}
        </StatGroup>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>نمو المستخدمين</CardTitle></CardHeader>
            <CardContent><AreaChart data={chartData} dataKey="value" xAxisKey="name" height={300} /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>حركة الأرباح</CardTitle></CardHeader>
            <CardContent><BarChart data={chartData} dataKey="value" xAxisKey="name" height={300} /></CardContent>
          </Card>
        </div>

        <StatGroup>
          {isLoading ? (
            <><StatSkeleton /><StatSkeleton /></>
          ) : (
            <>
              <Stat label="المعاملات" value={stats.totalTransactions} icon={<TrendingUp className="h-5 w-5" />} />
              <Stat label="أرباح اليوم" value="$145.20" icon={<DollarSign className="h-5 w-5" />} trend={8} trendLabel="منذ الأمس" />
            </>
          )}
        </StatGroup>
      </div>
    </Page>
  )
}
