import { createClient } from '@blinkdotnew/sdk'

export const blink = createClient({
  projectId: (import.meta as any).env.VITE_BLINK_PROJECT_ID || 'megaturboe-platform-b3r6ivc0',
  publishableKey: (import.meta as any).env.VITE_BLINK_PUBLISHABLE_KEY || 'blnk_pk_q_bZn_1x6nWs-yQEl6ZNYd48y3htnSbp',
  authRequired: false,
  auth: { mode: 'managed' },
}) as any
