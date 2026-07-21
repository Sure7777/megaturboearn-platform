import { createFileRoute } from '@tanstack/react-router'
import { Button, Badge, toast, Skeleton } from '@blinkdotnew/ui'
import { CheckSquare, ExternalLink, PlayCircle, Megaphone } from 'lucide-react'
import { motion } from 'framer-motion'
import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { tmaAPI, getCurrentUserId, type TMAItem, type TMAAdGroup } from '@/lib/tma-api'

export const Route = createFileRoute('/app/tasks')({ component: TMATasksPage })

function TaskCard({ task, groupName, onComplete }: { task: TMAItem; groupName: string; onComplete: (task: TMAItem) => void }) {
  const [completed, setCompleted] = useState(false)

  const handleDo = useCallback(async () => {
    const result = await tmaAPI.completeItem(getCurrentUserId(), task.id, 'task')
    if (result?.success) {
      setCompleted(true)
      toast.success(`+${result.points || task.reward_points} نقطة!`)
    } else {
      toast.error('ربما أكملت هذه المهمة اليوم')
    }
  }, [task])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      className={`bg-white/5 border rounded-2xl p-4 flex flex-col gap-3 transition-all ${
        completed ? 'border-green-500/50 bg-green-500/10' : 'border-white/10'
      }`}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-xl ${completed ? 'bg-green-500/30 text-green-300' : 'bg-blue-500/20 text-blue-400'}`}>
            {completed ? <CheckSquare className="h-5 w-5" /> : <PlayCircle className="h-5 w-5" />}
          </div>
          <div>
            <p className="font-black text-sm">{task.name}</p>
            <p className="text-[10px] text-white/40">نوع: {groupName}</p>
          </div>
        </div>
        <Badge className={`border-none font-black px-2 py-1 ${completed ? 'bg-green-600/30 text-green-400' : 'bg-[#D4AF37]/20 text-[#D4AF37]'}`}>
          {completed ? '✓ مكتمل' : `+ ${task.reward_points} نقطة`}
        </Badge>
      </div>
      <div className="h-px bg-white/5 w-full" />
      <div className="flex gap-2">
        <Button
          onClick={handleDo}
          disabled={completed}
          className={`flex-1 rounded-xl font-bold border-none shadow-lg h-10 text-sm ${
            completed ? 'bg-green-600/50 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {completed ? 'تم التنفيذ ✓' : 'تنفيذ المهمة'}
        </Button>
        <a href={task.url} target="_blank" rel="noopener noreferrer">
          <Button variant="ghost" size="icon" className="w-10 h-10 bg-white/5 rounded-xl border-none" type="button">
            <ExternalLink className="h-4 w-4 text-white/60" />
          </Button>
        </a>
      </div>
    </motion.div>
  )
}

function TMATasksPage() {
  const { data: items, isLoading } = useQuery({
    queryKey: ['tma', 'items', 'task'],
    queryFn: () => tmaAPI.getItems('task'),
    refetchInterval: 30_000,
  })

  const { data: groups } = useQuery({
    queryKey: ['tma', 'groups'],
    queryFn: () => tmaAPI.getAdGroups(),
  })

  const taskItems = (items || []).filter(i => i.type === 'task' && i.is_active == 1)

  const groupedTasks = new Map<string, TMAItem[]>()
  for (const item of taskItems) {
    const g = groups?.find(g => g.id === item.group_id)
    const gName = g?.name || item.group_id
    if (!groupedTasks.has(gName)) groupedTasks.set(gName, [])
    groupedTasks.get(gName)!.push(item)
  }

  const handleComplete = useCallback((task: TMAItem) => {
    // handled inside TaskCard
  }, [])

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex gap-4">
        <div className="flex-1 h-16 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-2xl flex items-center justify-center gap-3">
          <CheckSquare className="h-6 w-6 text-[#D4AF37]" />
          <div>
            <p className="text-xs text-white/50">المهام المتاحة</p>
            <p className="text-xl font-black text-[#D4AF37]">{taskItems.length} مهمة</p>
          </div>
        </div>
        <div className="flex-1 h-16 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center gap-3">
          <Megaphone className="h-6 w-6 text-blue-400" />
          <div>
            <p className="text-xs text-white/50">إعلانات</p>
            <p className="text-xl font-black text-blue-400">قريباً</p>
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
        ) : Array.from(groupedTasks.entries()).map(([groupName, tasks]) => (
          <div key={groupName} className="space-y-3">
            <h3 className="font-black text-base text-[#D4AF37] flex items-center gap-2">
              <div className="w-1.5 h-6 bg-[#D4AF37] rounded-full" />
              {groupName}
            </h3>
            {tasks.map(task => (
              <TaskCard key={task.id} task={task} groupName={groupName} onComplete={handleComplete} />
            ))}
          </div>
        ))}
        {!isLoading && taskItems.length === 0 && (
          <div className="text-center py-12 text-white/40">
            <CheckSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-bold">لا توجد مهام متاحة حالياً</p>
            <p className="text-xs mt-1">عد لاحقاً لمزيد من المهام</p>
          </div>
        )}
      </div>
    </div>
  )
}
