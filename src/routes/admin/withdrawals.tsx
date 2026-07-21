import { createFileRoute } from '@tanstack/react-router'
import { Page, PageHeader, PageTitle, StatGroup, Stat, DataTable, Button, Badge, Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, Skeleton, toast } from '@blinkdotnew/ui'
import { Check, X, Wallet, Clock, DollarSign } from 'lucide-react'
import { useState } from 'react'
import { useWithdrawals, useProcessWithdrawal, useDashboardStats } from '@/lib/api'
import type { Withdrawal } from '@/lib/api'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export const Route = createFileRoute('/admin/withdrawals')({
  component: () => (
    <ErrorBoundary>
      <WithdrawalsPage />
    </ErrorBoundary>
  ),
})

function WithdrawalsPage() {
  const [selected, setSelected] = useState<Withdrawal | null>(null)
  const { data: withdrawals, isLoading } = useWithdrawals()
  const { data: stats } = useDashboardStats()
  const process = useProcessWithdrawal()

  // Calculate totals
  const total = withdrawals ?? []
  const pendingList = total.filter(w => w.status === 'pending')
  const completedToday = total.filter(w => w.status === 'completed' && w.createdAt?.startsWith(new Date().toISOString().slice(0, 10))).length
  const pendingTotal = pendingList.reduce((s, w) => s + (Number(w.amountUsd) || 0), 0)

  const columns = [
    { accessorKey: 'id', header: 'رقم الطلب' },
    { accessorKey: 'userId', header: 'معرف المستخدم' },
    { accessorKey: 'amountUsd', header: 'المبلغ', cell: ({ row }: any) => `$${(Number(row.original.amountUsd) || 0).toFixed(2)}` },
    { accessorKey: 'network', header: 'الشبكة' },
    {
      accessorKey: 'status', header: 'الحالة',
      cell: ({ row }: any) => {
        const st: Record<string, { label: string; color: 'outline' | 'default' | 'destructive' }> = {
          pending: { label: 'قيد الانتظار', color: 'outline' },
          completed: { label: 'مكتمل', color: 'default' },
          rejected: { label: 'مرفوض', color: 'destructive' },
        }
        const s = st[row.original.status] || st.pending
        return <Badge variant={s.color}>{s.label}</Badge>
      },
    },
    { accessorKey: 'createdAt', header: 'التاريخ' },
    {
      id: 'actions', header: 'إجراءات',
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => setSelected(row.original)}>التفاصيل</Button>
            </SheetTrigger>
            <SheetContent side="left" className="sm:max-w-[400px] bg-card text-foreground">
              <SheetHeader><SheetTitle>تفاصيل طلب السحب</SheetTitle></SheetHeader>
              {selected && (
                <div className="py-6 space-y-6">
                  <div className="space-y-3 text-sm">
                    <div><span className="text-muted-foreground">رقم الطلب:</span> {selected.id}</div>
                    <div><span className="text-muted-foreground">معرف المستخدم:</span> {selected.userId}</div>
                    <div><span className="text-muted-foreground">المبلغ:</span> <b>${(Number(selected.amountUsd) || 0).toFixed(2)}</b></div>
                    <div><span className="text-muted-foreground">الشبكة:</span> {selected.network}</div>
                    <div><span className="text-muted-foreground">العنوان:</span> <span className="break-all text-xs">{selected.walletAddress}</span></div>
                    <div><span className="text-muted-foreground">التاريخ:</span> {selected.createdAt}</div>
                  </div>
                  {selected.status === 'pending' && (
                    <div className="flex gap-2 pt-4">
                      <Button className="flex-1" onClick={() => process.mutate({ id: selected.id, status: 'completed' })}>قبول الطلب</Button>
                      <Button className="flex-1" variant="destructive" onClick={() => process.mutate({ id: selected.id, status: 'rejected' })}>رفض الطلب</Button>
                    </div>
                  )}
                </div>
              )}
            </SheetContent>
          </Sheet>
        </div>
      ),
    },
  ]

  return (
    <Page>
      <PageHeader><PageTitle>طلبات السحب</PageTitle></PageHeader>
      <div className="space-y-6">
        <StatGroup>
          {isLoading ? (
            <><Skeleton className="h-[88px] w-full rounded-xl" /><Skeleton className="h-[88px] w-full rounded-xl" /><Skeleton className="h-[88px] w-full rounded-xl" /><Skeleton className="h-[88px] w-full rounded-xl" /></>
          ) : (
            <>
              <Stat label="طلبات معلقة" value={pendingList.length} icon={<Clock className="h-5 w-5" />} />
              <Stat label="إجمالي المعلق" value={`$${pendingTotal.toFixed(2)}`} icon={<DollarSign className="h-5 w-5" />} />
              <Stat label="مكتملة اليوم" value={completedToday} icon={<Check className="h-5 w-5" />} />
              <Stat label="رصيد الخزنة" value="$4,285.00" icon={<Wallet className="h-5 w-5" />} />
            </>
          )}
        </StatGroup>
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-64 w-full" /></div>
          ) : (
            <DataTable columns={columns} data={total} />
          )}
        </div>
      </div>
    </Page>
  )
}
