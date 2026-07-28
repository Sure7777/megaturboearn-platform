import { createFileRoute } from '@tanstack/react-router'
import { Page, PageHeader, PageTitle, PageActions, DataTable, Button, Badge, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, AutoForm, toast, Tabs, TabsList, TabsTrigger, TabsContent, Card, CardHeader, CardTitle, CardContent, Skeleton } from '@blinkdotnew/ui'
import { Plus, Edit2, Trash2, ExternalLink, Grid2X2, ToggleLeft, ToggleRight } from 'lucide-react'
import { z } from 'zod'
import { useState } from 'react'
import { useAdGroups, useItems, useCreateItem, useDeleteItem, useToggleItem } from '@/lib/api'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export const Route = createFileRoute('/admin/ads')({
  component: () => (
    <ErrorBoundary>
      <ContentManagementPage />
    </ErrorBoundary>
  ),
})

const itemSchema = z.object({
  name: z.string().min(1, 'الاسم مطلوب'),
  groupId: z.string().min(1, 'المجموعة مطلوبة'),
  type: z.string(),
  rewardPoints: z.number().min(1, 'المكافأة مطلوبة'),
  url: z.string().url('يجب إدخال رابط صحيح'),
  dailyLimit: z.number().default(1),
  maxTotalCompletions: z.number().default(1000),
})

function ContentManagementPage() {
  const [activeType, setActiveType] = useState('short')
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const { data: groups, isLoading: groupsLoading } = useAdGroups()
  const { data: items, isLoading: itemsLoading } = useItems(selectedGroup || undefined)
  const createItem = useCreateItem()
  const deleteItem = useDeleteItem()
  const toggleItem = useToggleItem()

  const filteredGroups = (groups ?? []).filter(g => g.type === activeType)
  const shortGroups = (groups ?? []).filter(g => g.type === 'short')
  const longGroups = (groups ?? []).filter(g => g.type === 'long')
  const taskGroups = (groups ?? []).filter(g => g.type === 'task')

  const columns = [
    { accessorKey: 'name', header: 'الاسم' },
    { accessorKey: 'rewardPoints', header: 'المكافأة' },
    {
      accessorKey: 'url',
      header: 'الرابط',
      cell: ({ row }: any) => (
        <a href={row.original.url} target="_blank" rel="noopener noreferrer" className="text-primary underline text-xs truncate block max-w-[150px]">{row.original.url}</a>
      ),
    },
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
        <div className="flex gap-1">
          <Button variant="ghost" size="icon"
            onClick={() => toggleItem.mutate({ id: row.original.id, active: row.original.isActive != 1 })}
            title={row.original.isActive == 1 ? 'تعطيل' : 'تفعيل'}>
            {row.original.isActive == 1 ? <ToggleRight className="h-4 w-4 text-emerald-500" /> : <ToggleLeft className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" asChild title="فتح الرابط">
            <a href={row.original.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a>
          </Button>
          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => { if (confirm('حذف العنصر؟')) deleteItem.mutate(row.original.id) }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  const handleCreate = (type: string) => (data: any) => {
    createItem.mutate({ ...data, type: type === 'tasks' ? 'task' : type === 'long' ? 'long' : 'short' })
  }

  const groupOptions = (gArr: any[]) => gArr.map(g => ({ value: g.id, label: g.name }))

  return (
    <Page>
      <PageHeader>
        <PageTitle>إدارة المحتوى (إعلانات ومهام)</PageTitle>
        <PageActions>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> إضافة عنصر جديد</Button>
            </DialogTrigger>
            <DialogContent className="bg-card text-foreground sm:max-w-[500px]">
              <DialogHeader><DialogTitle>إضافة إعلان أو مهمة</DialogTitle></DialogHeader>
              <AutoForm
                schema={itemSchema.extend({
                  groupId: z.enum(
                    (groups ?? []).map(g => g.id) as [string, ...string[]]
                  ),
                  type: z.enum(
                    activeType === 'tasks' ? ['task'] : activeType === 'long' ? ['long'] : ['short']
                  ),
                })}
                onSubmit={handleCreate(activeType)}
              />
            </DialogContent>
          </Dialog>
        </PageActions>
      </PageHeader>

      <Tabs defaultValue="short" onValueChange={(v) => { setActiveType(v); setSelectedGroup(null) }}>
        <TabsList className="bg-muted w-full md:w-auto">
          <TabsTrigger value="short">إعلانات قصيرة</TabsTrigger>
          <TabsTrigger value="long">إعلانات طويلة</TabsTrigger>
          <TabsTrigger value="tasks">المهام</TabsTrigger>
        </TabsList>

        {/* Group cards */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {groupsLoading ? (
            <><Skeleton className="h-24 rounded-xl" /><Skeleton className="h-24 rounded-xl" /><Skeleton className="h-24 rounded-xl" /></>
          ) : (
            filteredGroups.map((g) => {
              const count = (items ?? []).filter(i => i.groupId === g.id).length
              return (
                <Card
                  key={g.id}
                  className={`cursor-pointer transition-all hover:border-primary/50 ${selectedGroup === g.id ? 'border-primary ring-2 ring-primary/20' : 'border-border'}`}
                  onClick={() => setSelectedGroup(selectedGroup === g.id ? null : g.id)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Grid2X2 className="h-4 w-4 text-primary" /> {g.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">{count} عناصر</p>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>

        {/* Items table for selected group */}
        <TabsContent value={activeType} className="mt-6">
          <div className="bg-card rounded-xl border overflow-hidden">
            {itemsLoading ? (
              <div className="p-6 space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-64 w-full" /></div>
            ) : (
              <DataTable
                columns={columns}
                data={(items ?? []).filter(i => (selectedGroup ? i.groupId === selectedGroup : true))}
                searchable
                searchColumn="name"
              />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </Page>
  )
}
