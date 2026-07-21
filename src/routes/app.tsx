import { createFileRoute } from '@tanstack/react-router'
import { TMALayout } from '@/components/TMALayout'

export const Route = createFileRoute('/app')({
  component: TMALayout,
})
