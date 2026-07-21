import { useState, useRef, useCallback, useEffect } from 'react'
import { Button, toast } from '@blinkdotnew/ui'
import { motion, AnimatePresence } from 'framer-motion'
import { Gift, X } from 'lucide-react'

interface LuckyWheelProps {
  isOpen: boolean
  onClose: () => void
  onSpinResult: (prize: { label: string; points: number }) => void
  canSpin: boolean
  lastSpinDate?: string
}

const SEGMENTS = [
  { label: '10 نقاط', points: 10, color: '#D4AF37', textColor: '#1A2A6C' },
  { label: '50 نقطة', points: 50, color: '#1A2A6C', textColor: '#D4AF37' },
  { label: '20 نقطة', points: 20, color: '#B8860B', textColor: '#FFFFFF' },
  { label: '100 نقطة', points: 100, color: '#D4AF37', textColor: '#1A2A6C' },
  { label: '5 نقاط', points: 5, color: '#25398a', textColor: '#D4AF37' },
  { label: '200 نقطة', points: 200, color: '#B8860B', textColor: '#FFFFFF' },
  { label: '30 نقطة', points: 30, color: '#D4AF37', textColor: '#1A2A6C' },
  { label: '500 نقطة', points: 500, color: '#1A2A6C', textColor: '#D4AF37' },
]

const SEGMENT_ANGLE = 360 / SEGMENTS.length

function LuckyWheel({ isOpen, onClose, onSpinResult, canSpin, lastSpinDate }: LuckyWheelProps) {
  const [spinning, setSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [result, setResult] = useState<{ label: string; points: number } | null>(null)
  const [showResult, setShowResult] = useState(false)
  const wheelRef = useRef<HTMLDivElement>(null)

  const spin = useCallback(() => {
    if (spinning || !canSpin) return

    setSpinning(true)
    setResult(null)
    setShowResult(false)

    // Pick random segment
    const targetIndex = Math.floor(Math.random() * SEGMENTS.length)
    const targetAngle = targetIndex * SEGMENT_ANGLE + SEGMENT_ANGLE / 2
    // Multiple full spins + target position
    const fullSpins = 5 + Math.floor(Math.random() * 5) // 5-9 full spins
    const totalRotation = rotation + fullSpins * 360 + (360 - targetAngle)

    setRotation(totalRotation)

    // Determine result after spin completes
    setTimeout(() => {
      const normalizedAngle = totalRotation % 360
      const winningIndex = Math.floor((360 - normalizedAngle) / SEGMENT_ANGLE) % SEGMENTS.length
      const prize = SEGMENTS[winningIndex]
      setResult(prize)
      setShowResult(true)
      setSpinning(false)
      onSpinResult(prize)
    }, 4500)
  }, [spinning, canSpin, rotation, onSpinResult])

  const canSpinNow = canSpin && !spinning
  const nextSpinTime = lastSpinDate
    ? new Date(new Date(lastSpinDate).getTime() + 24 * 60 * 60 * 1000)
    : null
  const isCooldown = !!(nextSpinTime && nextSpinTime > new Date())
  const cooldownText = nextSpinTime
    ? `متاحة بعد ${Math.ceil((nextSpinTime.getTime() - Date.now()) / (60 * 60 * 1000))} ساعة`
    : ''

  if (!isOpen) return null

  const size = 320
  const center = size / 2
  const radius = center - 10

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          className="relative bg-[#1A2A6C] border-2 border-[#D4AF37] rounded-[40px] p-6 shadow-2xl flex flex-col items-center max-w-[380px] w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all"
          >
            <X className="h-4 w-4 text-white/70" />
          </button>

          {/* Title */}
          <h2 className="text-xl font-black text-[#D4AF37] mb-2">🎡 عجلة الحظ</h2>
          <p className="text-xs text-white/50 mb-4">
            {isCooldown ? cooldownText : 'دور العجلة واربح نقاطاً!'}
          </p>

          {/* Wheel */}
          <div className="relative mb-4">
            {/* Pointer */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-20">
              <div
                className="w-0 h-0"
                style={{
                  borderLeft: '14px solid transparent',
                  borderRight: '14px solid transparent',
                  borderTop: '28px solid #D4AF37',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                }}
              />
            </div>

            {/* Outer ring */}
            <div className="w-[320px] h-[320px] rounded-full border-[6px] border-[#D4AF37] shadow-[0_0_30px_rgba(212,175,55,0.3)] overflow-hidden">
              {/* Spinning wheel */}
              <motion.div
                ref={wheelRef}
                className="w-full h-full rounded-full relative"
                animate={{ rotate: rotation }}
                transition={{
                  duration: 4,
                  ease: [0.15, 0.85, 0.25, 1.0],
                  type: 'tween',
                }}
              >
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                  {SEGMENTS.map((seg, i) => {
                    const startAngle = (i * SEGMENT_ANGLE * Math.PI) / 180 - Math.PI / 2
                    const endAngle = ((i + 1) * SEGMENT_ANGLE * Math.PI) / 180 - Math.PI / 2
                    const x1 = center + radius * Math.cos(startAngle)
                    const y1 = center + radius * Math.sin(startAngle)
                    const x2 = center + radius * Math.cos(endAngle)
                    const y2 = center + radius * Math.sin(endAngle)

                    const midAngle = (startAngle + endAngle) / 2
                    const textRadius = radius * 0.55
                    const tx = center + textRadius * Math.cos(midAngle)
                    const ty = center + textRadius * Math.sin(midAngle)

                    const largeArc = SEGMENT_ANGLE > 180 ? 1 : 0

                    return (
                      <g key={i}>
                        <path
                          d={`M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`}
                          fill={seg.color}
                          stroke="#0D1530"
                          strokeWidth="1"
                        />
                        <text
                          x={tx}
                          y={ty}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill={seg.textColor}
                          fontSize="11"
                          fontWeight="800"
                          transform={`rotate(${(midAngle * 180) / Math.PI + 90}, ${tx}, ${ty})`}
                        >
                          {seg.label}
                        </text>
                      </g>
                    )
                  })}
                  {/* Center circle */}
                  <circle cx={center} cy={center} r="24" fill="#D4AF37" />
                  <circle cx={center} cy={center} r="18" fill="#1A2A6C" />
                  <text x={center} y={center} textAnchor="middle" dominantBaseline="central" fill="#D4AF37" fontSize="10" fontWeight="900">
                    🎁
                  </text>
                </svg>
              </motion.div>
            </div>

            {/* Lights border effect */}
            {SEGMENTS.map((_, i) => {
              const angle = (i * SEGMENT_ANGLE * Math.PI) / 180 - Math.PI / 2
              const lx = center + (radius + 12) * Math.cos(angle)
              const ly = center + (radius + 12) * Math.sin(angle)
              return (
                <div
                  key={`light-${i}`}
                  className="absolute w-3 h-3 rounded-full"
                  style={{
                    left: lx - 6,
                    top: ly - 6,
                    backgroundColor: i % 2 === 0 ? '#D4AF37' : '#FFD700',
                    boxShadow: '0 0 8px rgba(212,175,55,0.5)',
                    animation: spinning ? 'none' : `pulse ${1 + (i % 3) * 0.3}s infinite alternate`,
                  }}
                />
              )
            })}
          </div>

          {/* Spin button */}
          <Button
            onClick={spin}
            disabled={!canSpinNow || isCooldown}
            className={`w-48 h-14 rounded-2xl font-black text-lg border-none shadow-xl transition-all ${
              canSpinNow && !isCooldown
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-[#1A2A6C] animate-pulse hover:scale-105'
                : 'bg-white/10 text-white/40 cursor-not-allowed'
            }`}
          >
            {spinning ? '⏳ جاري الدوران...' : isCooldown ? '⏰ غير متاحة الآن' : '🎯 دور العجلة'}
          </Button>

          {/* Result popup */}
          <AnimatePresence>
            {showResult && result && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="absolute inset-0 flex items-center justify-center z-30"
              >
                <div className="bg-[#1A2A6C] border-2 border-[#D4AF37] rounded-3xl p-8 text-center shadow-2xl mx-4">
                  <p className="text-5xl mb-3">🎉</p>
                  <p className="text-[#D4AF37] text-xl font-black mb-2">مبروك!</p>
                  <p className="text-white text-3xl font-black mb-1">+{result.points} نقطة</p>
                  <p className="text-white/50 text-sm mb-5">{result.label}</p>
                  <Button
                    onClick={onClose}
                    className="bg-[#D4AF37] text-[#1A2A6C] rounded-xl font-black px-8 border-none"
                  >
                    حسناً، شكراً!
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Prize legend */}
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {SEGMENTS.slice(0, 4).map((seg, i) => (
              <span key={i} className="text-[10px] text-white/40 font-bold px-2 py-0.5 rounded-full bg-white/5">
                {seg.label}
              </span>
            ))}
            <span className="text-[10px] text-white/40 font-bold">...</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default LuckyWheel
