import { createFileRoute } from '@tanstack/react-router'
import { Page, PageHeader, PageTitle, DataTable, Button, Badge, Skeleton } from '@blinkdotnew/ui'
import { ExternalLink, ToggleRight, ToggleLeft, Trash2 } from 'lucide-react'
import { useAdGroups, useItems, useDeleteItem, useToggleItem } from '@/lib/api'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export const Route = createFileRoute('/admin/tasks')({
  component: () => (
    <ErrorBoundary>
      <TasksPage />
    </ErrorBoundary>
  ),
})

function TasksPage() {
  const { data: groups } = useAdGroups()
  const { data: items, isLoading } = useItems()
  const deleteItem = useDeleteItem()
  const toggleItem = useToggleItem()

  const taskItems = (items ?? []).filter(i => i.type === 'task')

  const columns = [
    { accessorKey: 'name', header: 'اسم المهمة' },
    { accessorKey: 'groupId', header: 'المجموعة', cell: ({ row }: any) => {
      const g = (groups ?? []).find(g => g.id === row.original.groupId)
      return g?.name ?? row.original.groupId
    }},
    { accessorKey: 'rewardPoints', header: 'المكافأة' },
    {
      accessorKey: 'progress', header: 'الإنجاز',
      cell: ({ row }: any) => `${row.original.currentCompletions ?? 0}/${row.original.maxTotalCompletions ?? 1000}`,
    },
    {
      accessorKey: 'isActive', header: 'الحالة',
      cell: ({ row }: any) => (
        <Badge variant={row.original.isActive == 1 ? 'default' : 'secondary'}>
          {row.original.isActive == 1 ? 'نشط' : 'متوقف'}
        </Badge>
      ),
    },
    {
      id: 'actions', header: 'إجراءات',
      cell: ({ row }: any) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon"
            onClick={() => toggleItem.mutate({ id: row.original.id, active: row.original.isActive != 1 })}>
            {row.original.isActive == 1 ? <ToggleRight className="h-4 w-4 text-emerald-500" /> : <ToggleLeft className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <a href={row.original.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a>
          </Button>
          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => { if (confirm('حذف المهمة؟')) deleteItem.mutate(row.original.id) }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <Page>
      <PageHeader><PageTitle>إدارة المهام ({taskItems.length})</PageTitle></PageHeader>
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-64 w-full" /></div>
        ) : (
          <DataTable columns={columns} data={taskItems} searchable searchColumn="name" />
        )}
      </div>
    </Page>
  )
}
