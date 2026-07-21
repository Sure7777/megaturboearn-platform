import { createFileRoute, Link } from '@tanstack/react-router'
import { Button, Badge, Tabs, TabsList, TabsTrigger, TabsContent, toast, Skeleton } from '@blinkdotnew/ui'
import { PlayCircle, Zap, Timer, Wallet, ExternalLink, CheckCircle2, TrendingUp, Megaphone } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useCallback, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { tmaAPI, getCurrentUserId, type TMAItem, type TMAAdGroup } from '@/lib/tma-api'

export const Route = createFileRoute('/app/ads')({ component: TMAAdsPage })

function AdCard({ ad, groupName, onComplete }: { ad: TMAItem; groupName: string; onComplete: (ad: TMAItem) => void }) {
  const [status, setStatus] = useState<'idle' | 'watching' | 'done'>('idle')
  const [countdown, setCountdown] = useState(0)
  const timerRef = useRef<any>(null)

  const DURATION = ad.type === 'short' ? 15 : 30

  const startWatch = useCallback(() => {
    setStatus('watching')
    setCountdown(DURATION)
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          setStatus('done')
          onComplete(ad)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    timerRef.current = interval
  }, [ad, onComplete, DURATION])

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white/5 border rounded-2xl p-4 flex items-center justify-between transition-all ${
        status === 'done' ? 'border-green-500/50 bg-green-500/10' : 'border-white/10 hover:bg-white/10'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl ${
          status === 'done' ? 'bg-green-500/30 text-green-300' :
          ad.type === 'short' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
        }`}>
          {status === 'done' ? <CheckCircle2 className="h-5 w-5" /> :
           ad.type === 'short' ? <Timer className="h-5 w-5" /> : <PlayCircle className="h-5 w-5" />}
        </div>
        <div>
          <p className="font-bold text-sm">{ad.name}</p>
          <p className="text-[10px] text-white/40">+{ad.reward_points} نقطة • {groupName}</p>
        </div>
      </div>

      {status === 'idle' && (
        <Button onClick={startWatch} className={`rounded-xl px-5 font-black h-10 text-sm border-none shadow-lg ${
          ad.type === 'short' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'
        }`}>
          {ad.type === 'short' ? <Zap className="h-3.5 w-3.5 ml-1" /> : <PlayCircle className="h-3.5 w-3.5 ml-1" />}
          مشاهدة
        </Button>
      )}

      {status === 'watching' && (
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full border-2 border-[#D4AF37] border-t-transparent animate-spin" />
          <span className="font-black text-[#D4AF37] text-lg">{countdown}s</span>
        </div>
      )}

      {status === 'done' && (
        <Badge className="bg-green-600/30 text-green-400 border-none font-black px-3 py-1.5 animate-pulse">
          +{ad.reward_points} نقطة ✓
        </Badge>
      )}
    </motion.div>
  )
}

function TMAAdsPage() {
  const userId = getCurrentUserId()
  const [activeType, setActiveType] = useState('short')
  const [totalPoints, setTotalPoints] = useState(0)

  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ['tma', 'items', activeType],
    queryFn: () => tmaAPI.getItems(activeType),
    refetchInterval: 30_000,
  })

  const { data: groups } = useQuery({
    queryKey: ['tma', 'groups'],
    queryFn: () => tmaAPI.getAdGroups(),
  })

  const filteredItems = (items || []).filter(i => i.type === activeType && i.is_active == 1)
  const groupedItems = new Map<string, TMAItem[]>()
  for (const item of filteredItems) {
    const g = groups?.find(g => g.id === item.group_id)
    const gName = g?.name || item.group_id
    if (!groupedItems.has(gName)) groupedItems.set(gName, [])
    groupedItems.get(gName)!.push(item)
  }

  const handleComplete = useCallback(async (ad: TMAItem) => {
    const result = await tmaAPI.completeItem(userId, ad.id, ad.type)
    if (result?.success) {
      setTotalPoints(p => p + (result.points || ad.reward_points))
      toast.success(`+${result.points || ad.reward_points} نقطة!`)
    }
  }, [userId])

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header Stats */}
      <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10">
        <div>
          <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">مكتسب اليوم</p>
          <p className="text-xl font-black text-[#D4AF37]">{totalPoints} نقطة</p>
        </div>
        <div className="text-left">
          <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider text-right">متاح</p>
          <Badge className="bg-blue-500/20 text-blue-400 border-none font-black">{filteredItems.length} إعلان</Badge>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="short" onValueChange={setActiveType} className="w-full">
        <TabsList className="w-full bg-white/5 border border-white/10 rounded-2xl p-1 h-14">
          <TabsTrigger value="short" className="flex-1 rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white font-bold gap-2">
            <Zap className="h-4 w-4" /> قصيرة (15s)
          </TabsTrigger>
          <TabsTrigger value="long" className="flex-1 rounded-xl data-[state=active]:bg-green-600 data-[state=active]:text-white font-bold gap-2">
            <PlayCircle className="h-4 w-4" /> طويلة (30s)
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeType} className="mt-5 space-y-6">
          {itemsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full rounded-2xl" />
              <Skeleton className="h-16 w-full rounded-2xl" />
              <Skeleton className="h-16 w-full rounded-2xl" />
            </div>
          ) : Array.from(groupedItems.entries()).map(([groupName, ads]) => (
            <div key={groupName} className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-6 bg-[#D4AF37] rounded-full" />
                <h3 className="font-black text-base">{groupName}</h3>
                <span className="text-[10px] text-white/30 font-bold">{ads.length} إعلانات</span>
              </div>
              {ads.map(ad => (
                <AdCard key={ad.id} ad={ad} groupName={groupName} onComplete={handleComplete} />
              ))}
            </div>
          ))}
          {!itemsLoading && filteredItems.length === 0 && (
            <div className="text-center py-12 text-white/40">
              <Megaphone className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-bold">لا توجد إعلانات متاحة حالياً</p>
              <p className="text-xs mt-1">عد لاحقاً لمزيد من الإعلانات</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Bottom CTA */}
      <Link to="/app/wallet" className="block">
        <Button className="w-full h-14 bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-[#1A2A6C] font-black text-lg rounded-2xl shadow-2xl border-none flex gap-2">
          <Wallet className="h-5 w-5" /> عرض المحفظة
        </Button>
      </Link>
    </div>
  )
}
