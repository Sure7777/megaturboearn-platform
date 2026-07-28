import { createFileRoute } from '@tanstack/react-router'
import { Page, PageHeader, PageTitle, DataTable, Badge, Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, AutoForm, toast, Skeleton, Input } from '@blinkdotnew/ui'
import { ShieldCheck, ShieldAlert, RefreshCw } from 'lucide-react'
import { z } from 'zod'
import { useUsers, useToggleBlock, useUpdateUserPoints } from '@/lib/api'
import type { User } from '@/lib/api'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export const Route = createFileRoute('/admin/users')({
  component: () => (
    <ErrorBoundary>
      <UsersPage />
    </ErrorBoundary>
  ),
})

const editPointsSchema = z.object({
  points: z.number().min(0, 'يجب أن تكون النقاط 0 أو أكثر'),
  usd: z.number().min(0, 'يجب أن يكون الدولار 0 أو أكثر'),
})

function UsersPage() {
  const { data: users, isLoading } = useUsers()
  const toggleBlock = useToggleBlock()
  const updatePoints = useUpdateUserPoints()

  const columns = [
    {
      accessorKey: 'displayName',
      header: 'المستخدم',
      cell: ({ row }: any) => (
        <div>
          <p className="font-medium">{row.original.displayName}</p>
          <p className="text-xs text-muted-foreground">{row.original.id}</p>
        </div>
      ),
    },
    { accessorKey: 'balancePoints', header: 'النقاط' },
    {
      accessorKey: 'balanceUsd',
      header: 'الدولار',
      cell: ({ row }: any) => `$${(Number(row.original.balanceUsd) || 0).toFixed(2)}`,
    },
    {
      accessorKey: 'level',
      header: 'المستوى',
      cell: ({ row }: any) => {
        const lvl = row.original.level || 'bronze'
        const levels: Record<string, { label: string; color: 'secondary' | 'outline' | 'default' | 'destructive' }> = {
          bronze: { label: 'برونزي', color: 'secondary' },
          silver: { label: 'فضي', color: 'outline' },
          gold: { label: 'ذهبي', color: 'default' },
          platinum: { label: 'بلاتيني', color: 'destructive' },
        }
        const l = levels[lvl] || levels.bronze
        return <Badge variant={l.color}>{l.label}</Badge>
      },
    },
    {
      accessorKey: 'isBlocked',
      header: 'الحالة',
      cell: ({ row }: any) => (
        <Badge variant={Number(row.original.isBlocked) ? 'destructive' : 'default'}>
          {Number(row.original.isBlocked) ? 'محظور' : 'نشط'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'إجراءات',
      cell: ({ row }: any) => {
        const user = row.original as User
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              title={Number(user.isBlocked) ? 'فك الحظر' : 'حظر'}
              onClick={() => toggleBlock.mutate({ id: user.id, blocked: !Number(user.isBlocked) })}
            >
              {Number(user.isBlocked) ? <ShieldCheck className="h-4 w-4 text-emerald-500" /> : <ShieldAlert className="h-4 w-4 text-red-500" />}
            </Button>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" title="تعديل الرصيد">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card text-foreground">
                <DialogHeader><DialogTitle>تعديل رصيد {user.displayName}</DialogTitle></DialogHeader>
                <AutoForm
                  schema={editPointsSchema}
                  onSubmit={(data: any) => updatePoints.mutate({ id: user.id, points: data.points, usd: data.usd })}
                />
              </DialogContent>
            </Dialog>
          </div>
        )
      },
    },
  ]

  return (
    <Page>
      <PageHeader><PageTitle>إدارة المستخدمين ({users?.length ?? 0})</PageTitle></PageHeader>
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <DataTable columns={columns} data={users ?? []} searchable searchColumn="displayName" />
        )}
      </div>
    </Page>
  )
}
