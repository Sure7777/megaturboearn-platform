import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  DB: D1Database
  ASSETS: { fetch: (req: Request) => Promise<Response> }
  BOT_TOKEN: string
  ADMIN_ID: string
  APP_URL: string
}

const app = new Hono<{ Bindings: Bindings }>()

// ─── CORS for ALL /api/* routes ───────────────────────────────────────────────
app.use('/api/*', cors())

// ─── Local D1 Fallback for Node/Vite Dev Environment ──────────────────────────
let dbInitialized = false

app.use('*', async (c, next) => {
  if (!c.env || !c.env.DB) {
    try {
      const { getLocalD1 } = await import('./local-d1')
      const localDb = getLocalD1()
      if (localDb) {
        c.env = {
          ...c.env,
          DB: localDb,
          BOT_TOKEN: c.env?.BOT_TOKEN || '8546533987:AAG_M_V48Jpn7zyMPYELIH9nX5cOmMNc-p8',
          ADMIN_ID: c.env?.ADMIN_ID || '6960850082',
          APP_URL: c.env?.APP_URL || 'https://megaturboearn-platform-hfii.vercel.app',
        }
      }
    } catch (e) {
      console.warn('Could not load local D1 fallback:', e)
    }
  }

  if (c.env?.DB && !dbInitialized) {
    try {
      await initDB(c.env.DB)
      dbInitialized = true
    } catch (e) {
      console.warn('Auto initDB error:', e)
    }
  }

  await next()
})

// ─── Admin Auth Middleware ───────────────────────────────────────────────────
const adminAuth = async (c: any, next: any) => {
  const apiKey = c.req.header('X-Admin-API-Key')
  if (apiKey !== c.env.ADMIN_ID) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  await next()
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const POINTS_PER_USD = 100000 // 100,000 points = $1.00 USDT (realistic economy with zero budget risk)
const MIN_WITHDRAWAL_USD = 0.20
const LUCKY_WHEEL_PRIZES = [50, 100, 200, 300, 500, 1000]

function randomPrize(): number {
  return LUCKY_WHEEL_PRIZES[Math.floor(Math.random() * LUCKY_WHEEL_PRIZES.length)]
}

async function sendMessage(token: string, chatId: string | number, text: string, replyMarkup?: any) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: replyMarkup,
      }),
    })
    return await res.json()
  } catch (error) {
    console.error('Error sending message:', error)
    return null
  }
}

async function initDB(db: D1Database) {
  try {
    await db.batch([
      db.prepare(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT,
          display_name TEXT,
          balance_points INTEGER DEFAULT 0,
          balance_usd REAL DEFAULT 0,
          level TEXT DEFAULT 'المبتدئ',
          referred_by TEXT,
          is_blocked INTEGER DEFAULT 0,
          last_lucky_wheel TEXT,
          mining_pph INTEGER DEFAULT 100,
          battery_expires_at TEXT,
          last_passive_claim_at TEXT,
          recharge_count INTEGER DEFAULT 0,
          tap_count INTEGER DEFAULT 0,
          ad_views_count INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `),
      db.prepare(`
        CREATE TABLE IF NOT EXISTS referrals (
          referrer_id TEXT,
          referred_id TEXT,
          level INTEGER DEFAULT 1,
          commission_earned REAL DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY(referrer_id, referred_id)
        )
      `),
      db.prepare(`
        CREATE TABLE IF NOT EXISTS items (
          id TEXT PRIMARY KEY,
          group_id TEXT,
          name TEXT,
          type TEXT,
          reward_points INTEGER DEFAULT 1000,
          url TEXT,
          daily_limit INTEGER DEFAULT 1,
          current_completions INTEGER DEFAULT 0,
          max_total_completions INTEGER DEFAULT 1000,
          is_active INTEGER DEFAULT 1,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `),
      db.prepare(`
        CREATE TABLE IF NOT EXISTS ad_groups (
          id TEXT PRIMARY KEY,
          name TEXT,
          type TEXT,
          order_index INTEGER DEFAULT 0,
          is_active INTEGER DEFAULT 1
        )
      `),
      db.prepare(`
        CREATE TABLE IF NOT EXISTS withdrawals (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          amount_usd REAL,
          network TEXT,
          wallet_address TEXT,
          status TEXT DEFAULT 'pending',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `),
      db.prepare(`
        CREATE TABLE IF NOT EXISTS transactions (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          type TEXT,
          amount_points INTEGER DEFAULT 0,
          amount_usd REAL DEFAULT 0,
          description TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `),
      db.prepare(`
        CREATE TABLE IF NOT EXISTS user_activity (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT,
          item_id TEXT,
          type TEXT,
          completed_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `),
      db.prepare(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT
        )
      `),
      db.prepare(`
        CREATE TABLE IF NOT EXISTS promo_codes (
          code TEXT PRIMARY KEY,
          reward_points INTEGER DEFAULT 1000,
          max_uses INTEGER DEFAULT 1000,
          current_uses INTEGER DEFAULT 0,
          expires_at TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `),
      db.prepare(`
        CREATE TABLE IF NOT EXISTS user_promo_claims (
          user_id TEXT,
          code TEXT,
          claimed_at TEXT DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY(user_id, code)
        )
      `),
      db.prepare(`
        CREATE TABLE IF NOT EXISTS user_rigs (
          user_id TEXT,
          rig_id TEXT,
          level INTEGER DEFAULT 1,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY(user_id, rig_id)
        )
      `),
      db.prepare(`
        CREATE TABLE IF NOT EXISTS daily_cipher (
          date_str TEXT PRIMARY KEY,
          word TEXT,
          reward_points INTEGER DEFAULT 5000
        )
      `),
      db.prepare(`
        CREATE TABLE IF NOT EXISTS user_cipher_claims (
          user_id TEXT,
          date_str TEXT,
          claimed_at TEXT DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY(user_id, date_str)
        )
      `),
      db.prepare(`
        CREATE TABLE IF NOT EXISTS user_combo_claims (
          user_id TEXT,
          date_str TEXT,
          claimed_at TEXT DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY(user_id, date_str)
        )
      `),
      db.prepare(`
        CREATE TABLE IF NOT EXISTS armies (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          general_id TEXT NOT NULL,
          logo TEXT DEFAULT '🛡️',
          morale_bonus INTEGER DEFAULT 10,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `),
      db.prepare(`
        CREATE TABLE IF NOT EXISTS army_members (
          army_id TEXT,
          user_id TEXT,
          rank TEXT DEFAULT 'Recruit',
          points_contributed INTEGER DEFAULT 0,
          joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY(army_id, user_id)
        )
      `),
      db.prepare(`
        CREATE TABLE IF NOT EXISTS raids (
          id TEXT PRIMARY KEY,
          army_id TEXT,
          target_name TEXT DEFAULT 'قلعة زعيم الظلال',
          status TEXT DEFAULT 'active',
          required_members INTEGER DEFAULT 5,
          joined_count INTEGER DEFAULT 1,
          reward_gold INTEGER DEFAULT 50000,
          expires_at TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `),
      db.prepare(`
        CREATE TABLE IF NOT EXISTS raid_participants (
          raid_id TEXT,
          user_id TEXT,
          joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY(raid_id, user_id)
        )
      `),
    ])

    // Migration helper for users columns (safe column addition check)
    try {
      const tableInfo: any = await db.prepare("PRAGMA table_info(users)").all()
      const cols = new Set((tableInfo?.results || []).map((c: any) => c.name))
      if (!cols.has('mining_pph')) await db.prepare("ALTER TABLE users ADD COLUMN mining_pph INTEGER DEFAULT 100").run()
      if (!cols.has('battery_expires_at')) await db.prepare("ALTER TABLE users ADD COLUMN battery_expires_at TEXT").run()
      if (!cols.has('last_passive_claim_at')) await db.prepare("ALTER TABLE users ADD COLUMN last_passive_claim_at TEXT").run()
      if (!cols.has('recharge_count')) await db.prepare("ALTER TABLE users ADD COLUMN recharge_count INTEGER DEFAULT 0").run()
      if (!cols.has('tap_count')) await db.prepare("ALTER TABLE users ADD COLUMN tap_count INTEGER DEFAULT 0").run()
      if (!cols.has('ad_views_count')) await db.prepare("ALTER TABLE users ADD COLUMN ad_views_count INTEGER DEFAULT 0").run()
      if (!cols.has('morale_percent')) await db.prepare("ALTER TABLE users ADD COLUMN morale_percent INTEGER DEFAULT 100").run()
      if (!cols.has('ad_revenue_usd')) await db.prepare("ALTER TABLE users ADD COLUMN ad_revenue_usd REAL DEFAULT 0").run()
      if (!cols.has('army_id')) await db.prepare("ALTER TABLE users ADD COLUMN army_id TEXT").run()
      if (!cols.has('army_rank')) await db.prepare("ALTER TABLE users ADD COLUMN army_rank TEXT DEFAULT 'Recruit'").run()
    } catch (e) {
      console.warn('Migration helper check notice:', e)
    }

    // Seed default items if empty or replace
    await db.batch([
      db.prepare(`INSERT OR REPLACE INTO items (id, group_id, name, type, reward_points, url, daily_limit, max_total_completions, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`).bind('item-s-1', 'g-s-1', 'شاهد إعلان Adgram سريع +150 نقطة', 'short', 150, 'https://t.me/MegaTurboEarnBot', 10, 10000),
      db.prepare(`INSERT OR REPLACE INTO items (id, group_id, name, type, reward_points, url, daily_limit, max_total_completions, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`).bind('item-s-2', 'g-s-1', 'زيارة موقع ممول شريك +200 نقطة', 'short', 200, 'https://t.me/MegaTurboEarnBot', 5, 10000),
      db.prepare(`INSERT OR REPLACE INTO items (id, group_id, name, type, reward_points, url, daily_limit, max_total_completions, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`).bind('item-l-1', 'g-l-1', 'شاهد فيديو إعلاني 15 ثانية +300 نقطة', 'long', 300, 'https://t.me/MegaTurboEarnBot', 5, 5000),
      db.prepare(`INSERT OR REPLACE INTO items (id, group_id, name, type, reward_points, url, daily_limit, max_total_completions, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`).bind('task-1', 'g-t-1', 'الاشتراك بالقناة الرسمية @MegaTurbo_world (+1,000 نقطة)', 'task', 1000, 'https://t.me/MegaTurbo_world', 1, 50000),
      db.prepare(`INSERT OR REPLACE INTO items (id, group_id, name, type, reward_points, url, daily_limit, max_total_completions, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`).bind('task-2', 'g-t-1', 'الانضمام لمجموعة المناقشات (+500 نقطة)', 'task', 500, 'https://t.me/MegaTurbo_world', 1, 50000),
      db.prepare(`INSERT OR REPLACE INTO items (id, group_id, name, type, reward_points, url, daily_limit, max_total_completions, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`).bind('task-3', 'g-t-1', 'تسجيل الدخول اليومي الممتاز (+200 نقطة)', 'task', 200, 'https://t.me/MegaTurboEarnBot', 1, 50000),
    ])

    // Seed admin user
    await db.prepare(`INSERT OR IGNORE INTO users (id, username, display_name, balance_points, balance_usd, level) VALUES (?, ?, ?, ?, ?, ?)`).bind('6960850082', 'admin', 'المدير العام', 25000, 0.25, 'ذهبي متميز').run()

  } catch (e) {
    console.error('initDB error:', e)
  }
}

// ─── 0. Database Auto-Init Endpoint ─────────────────────────────────────────
app.get('/api/init-db', async (c) => {
  await initDB(c.env.DB)
  return c.json({ success: true, message: 'Cloudflare D1 Database initialized successfully!' })
})

// ─── 1. Webhook Registration ─────────────────────────────────────────────────
app.get('/register-webhook', async (c) => {
  const token = c.env.BOT_TOKEN
  const url = new URL(c.req.url)
  const webhookUrl = `${url.protocol}//${url.host}/webhook`
  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${webhookUrl}`)
  const result: any = await res.json()
  return c.json(result)
})

// ─── 1b. GET /webhook for Browser Testing ─────────────────────────────────────
app.get('/webhook', async (c) => {
  await initDB(c.env.DB)
  return c.json({
    ok: true,
    service: 'MegaTurboEarn Telegram Bot Webhook',
    status: 'ACTIVE',
    info: 'Send POST requests with Telegram update objects, or visit /register-webhook to configure with Telegram API.',
  })
})

// ─── 2. Bot Webhook ──────────────────────────────────────────────────────────
app.post('/webhook', async (c) => {
  await initDB(c.env.DB)
  const token = c.env.BOT_TOKEN
  let update: any
  try {
    update = await c.req.json()
  } catch (e) {
    return c.text('OK')
  }

  // Handle /start command
  if (update.message?.text?.startsWith('/start')) {
    const chatId = update.message.chat.id
    const user = update.message.from
    const text = update.message.text
    const appUrl = c.env.APP_URL || 'https://megaturboearn-platform-hfii.vercel.app'

    // Extract referrer ID if present (ref_ param)
    let referrerId: string | null = null
    const parts = text.split(' ')
    if (parts.length > 1 && parts[1].startsWith('ref_')) {
      referrerId = parts[1].replace('ref_', '')
    }

    // Upsert user in DB
    await c.env.DB.prepare(
      `INSERT INTO users (id, username, display_name, referred_by)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET display_name = EXCLUDED.display_name`
    ).bind(user.id.toString(), user.username || '', user.first_name, referrerId).run()

    // Handle referral: register referrer relationship
    if (referrerId && referrerId !== user.id.toString()) {
      await c.env.DB.prepare(
        `INSERT OR IGNORE INTO referrals (referrer_id, referred_id, level) VALUES (?, ?, 1)`
      ).bind(referrerId, user.id.toString()).run()

      // Notify referrer
      await sendMessage(token, referrerId,
        `🎉 <b>مبروك!</b> المستخدم <b>${user.first_name}</b> انضم عبر رابط الإحالة الخاص بك! 💰`
      )
    }

    // Set Telegram chat menu button directly for seamless app launcher without welcome text
    try {
      await fetch(`https://api.telegram.org/bot${token}/setChatMenuButton`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          menu_button: {
            type: 'web_app',
            text: '🚀 MegaTurboEarn',
            web_app: { url: appUrl },
          },
        }),
      })
    } catch {}

    // Send direct inline WebApp button without welcome text
    await sendMessage(token, chatId, '🚀 MegaTurboEarn', {
      inline_keyboard: [
        [
          {
            text: '🚀 فتح التطبيق | Open App',
            web_app: { url: appUrl },
          },
        ],
      ],
    })
  }

  // Handle button clicks (callback queries)
  if (update.callback_query) {
    const cb = update.callback_query
    await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: cb.id }),
    })
  }

  return c.text('OK')
})

// ─── 3. User API (Enhanced with Mining & Battery state) ─────────────────────
app.get('/api/user/:id', async (c) => { return handleGetUserProfile(c) })
app.get('/api/tma/user/:id', async (c) => { return handleGetUserProfile(c) })

async function handleGetUserProfile(c: any) {
  try {
    const id = c.req.param('id')
    let user: any = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first()
    
    if (!user) {
      // Auto-create default user if not exists
      const now = new Date().toISOString()
      const batteryInit = new Date(Date.now() + 4 * 3600 * 1000).toISOString()
      await c.env.DB.prepare(
        `INSERT INTO users (id, username, display_name, balance_points, balance_usd, level, mining_pph, battery_expires_at, last_passive_claim_at)
         VALUES (?, 'user', 'معدّن جديد', 0, 0.00, 'المبتدئ', 0, ?, ?)`
      ).bind(id, batteryInit, now).run()
      user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first()
    }

    const nowMs = Date.now()
    const pph = user.mining_pph || 20
    const batteryExpiresMs = user.battery_expires_at ? new Date(user.battery_expires_at).getTime() : (nowMs + 4 * 3600 * 1000)
    const lastClaimMs = user.last_passive_claim_at ? new Date(user.last_passive_claim_at).getTime() : nowMs

    const isBatteryActive = batteryExpiresMs > nowMs
    const claimUntilMs = Math.min(nowMs, batteryExpiresMs)
    const hoursActive = Math.max(0, (claimUntilMs - lastClaimMs) / (3600 * 1000))
    const pendingPoints = Math.floor(hoursActive * pph)

    // Referrals count
    const refCountObj: any = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM referrals WHERE referrer_id = ? AND level = 1'
    ).bind(id).first()
    const activeRefs = refCountObj?.count || 0

    // User rigs
    const userRigs: any = await c.env.DB.prepare(
      'SELECT rig_id, level FROM user_rigs WHERE user_id = ?'
    ).bind(id).all()

    return c.json({
      ...user,
      mining_pph: pph,
      battery_expires_at: user.battery_expires_at || new Date(batteryExpiresMs).toISOString(),
      pending_passive_points: pendingPoints,
      battery_active: isBatteryActive,
      active_referrals_count: activeRefs,
      rigs: userRigs.results || []
    })
  } catch (e: any) {
    console.error('handleGetUserProfile error:', e)
    return c.json({ error: 'DB Error' }, 500)
  }
}

// ─── 3b. Interactive Tap Mining Endpoint ────────────────────────────────────
app.post('/api/tma/tap', async (c) => {
  try {
    const body: { userId: string; tapsCount?: number } = await c.req.json()
    const { userId, tapsCount = 1 } = body
    if (!userId) return c.json({ error: 'Missing userId' }, 400)

    const pointsAdded = Math.min(20, tapsCount * 1)

    await c.env.DB.prepare(
      'UPDATE users SET balance_points = balance_points + ?, tap_count = tap_count + ? WHERE id = ?'
    ).bind(pointsAdded, tapsCount, userId).run()

    const updatedUser: any = await c.env.DB.prepare('SELECT balance_points FROM users WHERE id = ?').bind(userId).first()

    return c.json({ success: true, pointsAdded, newBalance: updatedUser?.balance_points || 0 })
  } catch (e) {
    return c.json({ error: 'Server error' }, 500)
  }
})

// ─── 3c. Recharge Generator Battery (4 Hours) ───────────────────────────────
app.post('/api/tma/recharge-battery', async (c) => {
  try {
    const body: { userId: string } = await c.req.json()
    const { userId } = body
    if (!userId) return c.json({ error: 'Missing userId' }, 400)

    const user: any = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first()
    if (!user) return c.json({ error: 'User not found' }, 404)

    const rechargeCost = 500
    if (user.balance_points < rechargeCost) {
      return c.json({ error: `رصيدك لا يكفي لشحن البطارية. يلزم ${rechargeCost} نقطة مخصومة بالإضافة لمشاهدة الإعلان.` }, 400)
    }

    const nowMs = Date.now()
    const currentExpMs = user.battery_expires_at ? new Date(user.battery_expires_at).getTime() : nowMs
    const baseMs = Math.max(nowMs, currentExpMs)
    const newExpiresIso = new Date(baseMs + 1 * 3600 * 1000).toISOString()

    await c.env.DB.prepare(
      `UPDATE users SET
         battery_expires_at = ?,
         recharge_count = recharge_count + 1,
         ad_views_count = ad_views_count + 1,
         balance_points = balance_points - ?
       WHERE id = ?`
    ).bind(newExpiresIso, rechargeCost, userId).run()

    const updatedUser: any = await c.env.DB.prepare('SELECT balance_points FROM users WHERE id = ?').bind(userId).first()

    return c.json({
      success: true,
      batteryExpiresAt: newExpiresIso,
      pointsDeducted: rechargeCost,
      newBalance: updatedUser?.balance_points || 0,
      message: `تم مشاهدة الإعلان وخصم ${rechargeCost} نقطة وشحن بطارية المولد لـ ساعة واحدة بنجاح! ⚡`
    })
  } catch (e) {
    return c.json({ error: 'Server error' }, 500)
  }
})

// ─── 3d. Claim Passive Mining Earnings ──────────────────────────────────────
app.post('/api/tma/claim-passive', async (c) => {
  try {
    const body: { userId: string } = await c.req.json()
    const { userId } = body
    if (!userId) return c.json({ error: 'Missing userId' }, 400)

    const user: any = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first()
    if (!user) return c.json({ error: 'User not found' }, 404)

    const nowMs = Date.now()
    const pph = user.mining_pph || 100
    const batteryExpiresMs = user.battery_expires_at ? new Date(user.battery_expires_at).getTime() : nowMs
    const lastClaimMs = user.last_passive_claim_at ? new Date(user.last_passive_claim_at).getTime() : nowMs

    const claimUntilMs = Math.min(nowMs, batteryExpiresMs)
    const hoursActive = Math.max(0, (claimUntilMs - lastClaimMs) / (3600 * 1000))
    const claimedPoints = Math.floor(hoursActive * pph)

    if (claimedPoints <= 0) {
      return c.json({ error: 'لا يوجد أرباح للتعدين متراكمة حالياً' }, 400)
    }

    const nowIso = new Date().toISOString()
    await c.env.DB.prepare(
      `UPDATE users SET
         balance_points = balance_points + ?,
         last_passive_claim_at = ?
       WHERE id = ?`
    ).bind(claimedPoints, nowIso, userId).run()

    const updatedUser: any = await c.env.DB.prepare('SELECT balance_points FROM users WHERE id = ?').bind(userId).first()

    return c.json({
      success: true,
      claimedPoints,
      newBalance: updatedUser?.balance_points || 0,
      message: `تم جمع ${claimedPoints} نقطة ذهبية من أرباح التعدين السلبي بنجاح! ⛏️`
    })
  } catch (e) {
    return c.json({ error: 'Server error' }, 500)
  }
})

// ─── 3e. Buy / Upgrade Dark Energy Rig ──────────────────────────────────────
app.post('/api/tma/buy-rig', async (c) => {
  try {
    const body: { userId: string; rigId: string } = await c.req.json()
    const { userId, rigId } = body
    if (!userId || !rigId) return c.json({ error: 'Missing userId or rigId' }, 400)

    const RIGS_MAP: Record<string, { cost: number; pphBoost: number; name: string }> = {
      'rig-1': { cost: 1000, pphBoost: 15, name: 'محول إشعاع الشمس' },
      'rig-2': { cost: 3000, pphBoost: 50, name: 'منجم كوانتوم السريع' },
      'rig-3': { cost: 8000, pphBoost: 150, name: 'مستخرج المادة المظلمة' },
      'rig-4': { cost: 20000, pphBoost: 400, name: 'مفاعل الاندماج النووي' },
      'rig-5': { cost: 50000, pphBoost: 1200, name: 'النواة الرقمية بالذكاء الاصطناعي' },
    }

    const targetRig = RIGS_MAP[rigId]
    if (!targetRig) return c.json({ error: 'نوع الكارت غير صحيح' }, 400)

    const user: any = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first()
    if (!user) return c.json({ error: 'المستخدم غير موجود' }, 404)

    if (user.balance_points < targetRig.cost) {
      return c.json({ error: `رصيدك لا يكفي لتطوير هذا المنجم. يلزم ${targetRig.cost.toLocaleString()} نقطة.` }, 400)
    }

    // Deduct cost & add PPH boost
    await c.env.DB.prepare(
      'UPDATE users SET balance_points = balance_points - ?, mining_pph = mining_pph + ? WHERE id = ?'
    ).bind(targetRig.cost, targetRig.pphBoost, userId).run()

    // Record user rig
    await c.env.DB.prepare(
      `INSERT INTO user_rigs (user_id, rig_id, level) VALUES (?, ?, 1)
       ON CONFLICT(user_id, rig_id) DO UPDATE SET level = level + 1`
    ).bind(userId, rigId).run()

    const updatedUser: any = await c.env.DB.prepare('SELECT balance_points, mining_pph FROM users WHERE id = ?').bind(userId).first()

    return c.json({
      success: true,
      newPph: updatedUser?.mining_pph || 0,
      newBalance: updatedUser?.balance_points || 0,
      message: `مبروك! تم ترقية ${targetRig.name} بنجاح وزيادة الأرباح بمقدار +${targetRig.pphBoost}/ساعة! 🚀`
    })
  } catch (e) {
    return c.json({ error: 'Server error' }, 500)
  }
})

// ─── 3f. Claim Daily Cipher ─────────────────────────────────────────────────
app.post('/api/tma/cipher/claim', async (c) => {
  try {
    const body: { userId: string; word: string } = await c.req.json()
    const { userId, word } = body
    if (!userId || !word) return c.json({ error: 'برجاء إدخال الكلمة السرية' }, 400)

    const dateStr = new Date().toISOString().split('T')[0]
    const cleanWord = word.trim().toUpperCase()

    // Default daily cipher word
    const correctWord = 'MINER'
    if (cleanWord !== correctWord) {
      return c.json({ error: 'الكلمة السرية للغز اليوم غير صحيحة! جرب مرة أخرى.' }, 400)
    }

    const existing: any = await c.env.DB.prepare(
      'SELECT * FROM user_cipher_claims WHERE user_id = ? AND date_str = ?'
    ).bind(userId, dateStr).first()

    if (existing) {
      return c.json({ error: 'لقد قمت بفك لغز اليوم واستلام المكافأة بالفعل!' }, 400)
    }

    const reward = 1000
    await c.env.DB.prepare(
      'INSERT INTO user_cipher_claims (user_id, date_str) VALUES (?, ?)'
    ).bind(userId, dateStr).run()

    await c.env.DB.prepare(
      'UPDATE users SET balance_points = balance_points + ? WHERE id = ?'
    ).bind(reward, userId).run()

    return c.json({ success: true, points: reward, message: `ذكاء فائق! تم فك لغز اليوم واستلام +${reward} نقطة بنجاح! 🧠✨` })
  } catch (e) {
    return c.json({ error: 'Server error' }, 500)
  }
})

// ─── 3g. Claim Daily Combo ──────────────────────────────────────────────────
app.post('/api/tma/combo/claim', async (c) => {
  try {
    const body: { userId: string } = await c.req.json()
    const { userId } = body
    if (!userId) return c.json({ error: 'Missing userId' }, 400)

    const dateStr = new Date().toISOString().split('T')[0]

    // Check user rigs count
    const rigsCountObj: any = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM user_rigs WHERE user_id = ?'
    ).bind(userId).first()

    if (!rigsCountObj || rigsCountObj.count < 3) {
      return c.json({ error: 'لتحقيق الكومبو اليومي يلزمه امتلاك وتطوير 3 كروت/مناجم على الأقل!' }, 400)
    }

    const existing: any = await c.env.DB.prepare(
      'SELECT * FROM user_combo_claims WHERE user_id = ? AND date_str = ?'
    ).bind(userId, dateStr).first()

    if (existing) {
      return c.json({ error: 'لقد استلمت مكافأة الكومبو اليومي بالفعل!' }, 400)
    }

    const comboReward = 2500
    await c.env.DB.prepare(
      'INSERT INTO user_combo_claims (user_id, date_str) VALUES (?, ?)'
    ).bind(userId, dateStr).run()

    await c.env.DB.prepare(
      'UPDATE users SET balance_points = balance_points + ? WHERE id = ?'
    ).bind(comboReward, userId).run()

    return c.json({ success: true, points: comboReward, message: `مبروك! تم فتح الكومبو اليومي واستلام +${comboReward} نقطة! 🎁🎉` })
  } catch (e) {
    return c.json({ error: 'Server error' }, 500)
  }
})

// ─── 3h. Co-op Send Energy Pulse to Friend ──────────────────────────────────
app.post('/api/tma/send-pulse', async (c) => {
  try {
    const body: { userId: string; targetUserId?: string } = await c.req.json()
    const { userId, targetUserId } = body
    if (!userId) return c.json({ error: 'Missing userId' }, 400)

    const pulseCost = 50
    const user: any = await c.env.DB.prepare('SELECT balance_points FROM users WHERE id = ?').bind(userId).first()
    if (!user) return c.json({ error: 'User not found' }, 404)

    if (user.balance_points < pulseCost) {
      return c.json({ error: `رصيدك لا يكفي لإرسال نبضة الطاقة. يلزم ${pulseCost} نقطة.` }, 400)
    }

    await c.env.DB.prepare(
      'UPDATE users SET balance_points = balance_points - ? WHERE id = ?'
    ).bind(pulseCost, userId).run()

    if (targetUserId) {
      try {
        const msg = `⚡ <b>نبضة طاقة من صديقك!</b>\nقام صديقك بإرسال نبضة طاقة لتذكيرك بتشغيل مولد الطاقة المظلمة وتلقي أرباح التعدين الأن! 🚀`
        await sendMessage(c.env.BOT_TOKEN, targetUserId, msg)
      } catch (e) {
        console.warn('Error sending pulse bot message:', e)
      }
    }

    return c.json({ success: true, message: `تم إرسال نبضة طاقة وتنبيه صديقك بنجاح! ⚡ (تم خصم ${pulseCost} نقطة)` })
  } catch (e) {
    return c.json({ error: 'Server error' }, 500)
  }
})

// ─── 3i. Mass Broadcast to Referral Team ────────────────────────────────────
app.post('/api/tma/mass-broadcast', async (c) => {
  try {
    const body: { userId: string; costPoints?: number } = await c.req.json()
    const { userId, costPoints = 5000 } = body
    if (!userId) return c.json({ error: 'Missing userId' }, 400)

    const user: any = await c.env.DB.prepare('SELECT balance_points FROM users WHERE id = ?').bind(userId).first()
    if (!user) return c.json({ error: 'User not found' }, 404)

    if (user.balance_points < costPoints) {
      return c.json({ error: `رصيدك لا يكفي لإرسال التنبيه الجماعي. يلزم ${costPoints.toLocaleString()} نقطة.` }, 400)
    }

    // Deduct cost
    await c.env.DB.prepare(
      'UPDATE users SET balance_points = balance_points - ? WHERE id = ?'
    ).bind(costPoints, userId).run()

    // Get referrals
    const refs: any = await c.env.DB.prepare(
      'SELECT referred_id FROM referrals WHERE referrer_id = ? AND level = 1'
    ).bind(userId).all()

    const refList = refs?.results || []
    let sentCount = 0

    for (const r of refList) {
      try {
        const msg = `📢 <b>تنبيه هام من قائد فريق الإحالة الخاص بك!</b>\nتم إرسال نداء لتشغيل منجم الطاقة المظلمة الخاص بك الآن وعدم تفويت الأرباح المعلقة! ⛏️⚡`
        await sendMessage(c.env.BOT_TOKEN, r.referred_id, msg)
        sentCount++
      } catch (e) {
        // Continue loop if one fails
      }
    }

    return c.json({
      success: true,
      count: sentCount,
      message: `تم إرسال التنبيه الجماعي بنجاح إلى ${sentCount} عضو في فريقك! 📢 (تم خصم ${costPoints.toLocaleString()} نقطة)`
    })
  } catch (e) {
    return c.json({ error: 'Server error' }, 500)
  }
})

// ─── 3j. Create Paid Task via TON Deposit ───────────────────────────────────
app.post('/api/tma/create-paid-task', async (c) => {
  try {
    const body: {
      userId: string;
      title: string;
      url: string;
      rewardPoints: number;
      targetCompletions: number;
      depositAmountUsd: number;
      txHash?: string
    } = await c.req.json()

    const { userId, title, url, rewardPoints, targetCompletions, depositAmountUsd, txHash } = body
    if (!userId || !title || !url || !targetCompletions) {
      return c.json({ error: 'برجاء استكمال بيانات المهمة الحقلية' }, 400)
    }

    const id = crypto.randomUUID()
    await c.env.DB.prepare(
      `INSERT INTO items (
        id, group_id, name, type, reward_points, url, daily_limit, max_total_completions, is_active, creator_id, total_deposit_usd
       ) VALUES (?, 'g-paid', ?, 'task', ?, ?, 1, ?, 1, ?, ?)`
    ).bind(id, title, rewardPoints || 500, url, targetCompletions, userId, depositAmountUsd || 1.0).run()

    return c.json({
      success: true,
      taskId: id,
      message: `🎉 تم إنشاء وتفعيل المهمة المدفوعة "${title}" بنجاح وتوجيهها للمستخدمين!`
    })
  } catch (e) {
    return c.json({ error: 'Server error' }, 500)
  }
})

// ─── 4. Admin Stats ──────────────────────────────────────────────────────────
app.get('/api/admin/stats', adminAuth, async (c) => {
  try {
    const stats = await c.env.DB.prepare(`
      SELECT
        (SELECT COUNT(*) FROM users) as totalUsers,
        (SELECT COUNT(*) FROM items WHERE type != 'task') as totalAds,
        (SELECT COUNT(*) FROM withdrawals WHERE status = 'pending') as pendingWithdrawals,
        (SELECT COALESCE(SUM(amount_usd), 0) FROM transactions WHERE type = 'reward') as totalEarnings
    `).first()
    return c.json(stats)
  } catch (e) {
    return c.json({ error: 'DB Error' }, 500)
  }
})

// ─── 5. Admin Users ──────────────────────────────────────────────────────────
app.get('/api/admin/users', adminAuth, async (c) => {
  try {
    const users = await c.env.DB.prepare('SELECT * FROM users ORDER BY created_at DESC LIMIT 500').all()
    return c.json(users.results)
  } catch (e) {
    return c.json({ error: 'DB Error' }, 500)
  }
})

// ─── 6. Admin Withdrawals ────────────────────────────────────────────────────
app.get('/api/admin/withdrawals', adminAuth, async (c) => {
  try {
    const withdrawals = await c.env.DB.prepare('SELECT * FROM withdrawals ORDER BY created_at DESC LIMIT 500').all()
    return c.json(withdrawals.results)
  } catch (e) {
    return c.json({ error: 'DB Error' }, 500)
  }
})

// ─── 7. Admin Items ──────────────────────────────────────────────────────────
app.get('/api/admin/items', adminAuth, async (c) => {
  try {
    const items = await c.env.DB.prepare('SELECT * FROM items ORDER BY created_at DESC').all()
    return c.json(items.results)
  } catch (e) {
    return c.json({ error: 'DB Error' }, 500)
  }
})

// ─── 8. Admin Create Item ────────────────────────────────────────────────────
app.post('/api/admin/items', adminAuth, async (c) => {
  try {
    const body: any = await c.req.json()
    const id = crypto.randomUUID()
    await c.env.DB.prepare(
      'INSERT INTO items (id, group_id, name, type, reward_points, url, daily_limit, max_total_completions) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      id,
      body.groupId,
      body.name,
      body.type,
      body.rewardPoints,
      body.url,
      body.dailyLimit ?? 1,
      body.maxCompletions ?? 1000
    ).run()
    return c.json({ success: true, id })
  } catch (e) {
    return c.json({ error: 'DB Error' }, 500)
  }
})

// ─── 8b. Admin Process Withdrawal ────────────────────────────────────────────
app.post('/api/admin/withdrawals/process', adminAuth, async (c) => {
  try {
    const body: { id: string; status: string } = await c.req.json()
    const { id, status } = body
    if (!id || !status) return c.json({ error: 'Missing id or status' }, 400)

    // Update status in withdrawals table
    await c.env.DB.prepare(
      'UPDATE withdrawals SET status = ? WHERE id = ?'
    ).bind(status, id).run()

    // Log the transaction update
    const withdrawal: any = await c.env.DB.prepare('SELECT * FROM withdrawals WHERE id = ?').bind(id).first()
    if (withdrawal) {
      const now = new Date().toISOString()
      const txId = crypto.randomUUID()
      await c.env.DB.prepare(
        'INSERT INTO transactions (id, user_id, type, amount_usd, description, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(txId, withdrawal.user_id, 'withdrawal_update', withdrawal.amount_usd, `Withdrawal #${id} processed: ${status}`, now).run()

      // Notify user via Telegram Bot
      try {
        const msg = status === 'completed'
          ? `✅ <b>تم قبول طلب السحب الخاص بك بنجاح!</b>\n💵 تم إرسال <b>$${withdrawal.amount_usd.toFixed(2)} USDT</b> إلى محفظتك.`
          : `❌ <b>تم رفض طلب السحب الخاص بك!</b>\nيرجى التواصل مع الدعم للتفاصيل.`
        await sendMessage(c.env.BOT_TOKEN, withdrawal.user_id, msg)
      } catch (e) {
        console.error('Error sending bot message:', e)
      }
    }

    return c.json({ success: true })
  } catch (e) {
    console.error('Error processing withdrawal:', e)
    return c.json({ error: 'DB Error' }, 500)
  }
})

// ─── 8c. Admin Toggle Block User ──────────────────────────────────────────────
app.post('/api/admin/users/block', adminAuth, async (c) => {
  try {
    const body: { id: string; blocked: number } = await c.req.json()
    const { id, blocked } = body
    if (!id) return c.json({ error: 'Missing id' }, 400)

    await c.env.DB.prepare(
      'UPDATE users SET is_blocked = ? WHERE id = ?'
    ).bind(blocked, id).run()

    return c.json({ success: true })
  } catch (e) {
    return c.json({ error: 'DB Error' }, 500)
  }
})

// ─── 8d. Admin Update User Balance ────────────────────────────────────────────
app.post('/api/admin/users/balance', adminAuth, async (c) => {
  try {
    const body: { id: string; points: number; usd: number } = await c.req.json()
    const { id, points, usd } = body
    if (!id) return c.json({ error: 'Missing id' }, 400)

    await c.env.DB.prepare(
      'UPDATE users SET balance_points = ?, balance_usd = ? WHERE id = ?'
    ).bind(points, usd, id).run()

    return c.json({ success: true })
  } catch (e) {
    return c.json({ error: 'DB Error' }, 500)
  }
})

// ─── 8d2. Admin Zero Out All User Balances ──────────────────────────────────
app.post('/api/admin/zero-balances', adminAuth, async (c) => {
  try {
    await c.env.DB.prepare('UPDATE users SET balance_points = 0, balance_usd = 0').run()
    return c.json({ success: true, message: 'All user balances reset to 0' })
  } catch (e) {
    return c.json({ error: 'DB Error' }, 500)
  }
})

// ─── 8e. Admin Toggle Item Active ─────────────────────────────────────────────
app.post('/api/admin/items/toggle', adminAuth, async (c) => {
  try {
    const body: { id: string; active: number } = await c.req.json()
    const { id, active } = body
    if (!id) return c.json({ error: 'Missing id' }, 400)

    await c.env.DB.prepare(
      'UPDATE items SET is_active = ? WHERE id = ?'
    ).bind(active, id).run()

    return c.json({ success: true })
  } catch (e) {
    return c.json({ error: 'DB Error' }, 500)
  }
})

// ─── 8f. Admin Delete Item ────────────────────────────────────────────────────
app.delete('/api/admin/items/:id', adminAuth, async (c) => {
  try {
    const id = c.req.param('id')
    await c.env.DB.prepare('DELETE FROM items WHERE id = ?').bind(id).run()
    return c.json({ success: true })
  } catch (e) {
    return c.json({ error: 'DB Error' }, 500)
  }
})

// ─── 8g. Admin Get Settings ───────────────────────────────────────────────────
app.get('/api/admin/settings', adminAuth, async (c) => {
  try {
    const result = await c.env.DB.prepare('SELECT * FROM settings').all()
    const settingsMap: Record<string, string> = {}
    for (const row of result.results as any[]) {
      settingsMap[row.key] = row.value
    }
    return c.json(settingsMap)
  } catch (e) {
    return c.json({ error: 'DB Error' }, 500)
  }
})

// ─── 8h. Admin Save Settings ──────────────────────────────────────────────────
app.post('/api/admin/settings', adminAuth, async (c) => {
  try {
    const body: Record<string, string> = await c.req.json()
    for (const [key, value] of Object.entries(body)) {
      await c.env.DB.prepare(
        `INSERT INTO settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value`
      ).bind(key, value).run()
    }
    return c.json({ success: true })
  } catch (e) {
    return c.json({ error: 'DB Error' }, 500)
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// TMA API Routes (no auth — called from mini app)
// ═══════════════════════════════════════════════════════════════════════════════

// ─── 9. TMA Items by Type ────────────────────────────────────────────────────
app.get('/api/tma/items', async (c) => {
  try {
    const type = c.req.query('type') // short, long, task
    if (!type) return c.json({ error: 'type query param required' }, 400)
    const items = await c.env.DB.prepare(
      'SELECT * FROM items WHERE type = ? AND is_active = 1 ORDER BY created_at ASC'
    ).bind(type).all()
    return c.json(items.results)
  } catch (e) {
    return c.json({ error: 'DB Error' }, 500)
  }
})

// ─── 10. TMA Groups ──────────────────────────────────────────────────────────
app.get('/api/tma/groups', async (c) => {
  try {
    const groups = await c.env.DB.prepare(
      'SELECT * FROM ad_groups WHERE is_active = 1 ORDER BY type, order_index'
    ).all()
    return c.json(groups.results)
  } catch (e) {
    return c.json({ error: 'DB Error' }, 500)
  }
})

// ─── 11. TMA Transactions ────────────────────────────────────────────────────
app.get('/api/tma/transactions/:userId', async (c) => {
  try {
    const userId = c.req.param('userId')
    const transactions = await c.env.DB.prepare(
      'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 100'
    ).bind(userId).all()
    return c.json(transactions.results)
  } catch (e) {
    return c.json({ error: 'DB Error' }, 500)
  }
})

// ─── 12. TMA Complete Item / Ad ──────────────────────────────────────────────
app.post('/api/tma/complete', async (c) => {
  try {
    const body: { userId: string; itemId: string; type: string } = await c.req.json()
    const { userId, itemId, type } = body
    if (!userId || !itemId) return c.json({ error: 'Missing userId or itemId' }, 400)

    // Fetch the item
    const item: any = await c.env.DB.prepare(
      'SELECT * FROM items WHERE id = ? AND is_active = 1'
    ).bind(itemId).first()
    if (!item) return c.json({ error: 'Item not found' }, 404)

    // Check total completions limit
    if (item.current_completions >= item.max_total_completions) {
      return c.json({ error: 'Item has reached its total completion limit' }, 400)
    }

    // Check daily limit — count user's completions of this item today
    const todayCount: any = await c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM user_activity
       WHERE user_id = ? AND item_id = ? AND DATE(completed_at) = DATE('now')`
    ).bind(userId, itemId).first()
    if (todayCount && todayCount.count >= item.daily_limit) {
      return c.json({ error: 'Daily limit reached for this item' }, 400)
    }

    const now = new Date().toISOString()

    // Insert user_activity record
    await c.env.DB.prepare(
      'INSERT INTO user_activity (user_id, item_id, type, completed_at) VALUES (?, ?, ?, ?)'
    ).bind(userId, itemId, type, now).run()

    // Increment item's current_completions
    await c.env.DB.prepare(
      'UPDATE items SET current_completions = current_completions + 1 WHERE id = ?'
    ).bind(itemId).run()

    // Add reward points to user's balance
    const points = item.reward_points
    await c.env.DB.prepare(
      'UPDATE users SET balance_points = balance_points + ? WHERE id = ?'
    ).bind(points, userId).run()

    // Create transaction record
    const txId = crypto.randomUUID()
    await c.env.DB.prepare(
      'INSERT INTO transactions (id, user_id, type, amount_points, description, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(txId, userId, 'reward', points, `Completed ${type}: ${item.name}`, now).run()

    return c.json({ success: true, points })
  } catch (e) {
    console.error('/api/tma/complete error:', e)
    return c.json({ error: 'Server error' }, 500)
  }
})

// ─── 13. TMA Convert Points to USD ───────────────────────────────────────────
app.post('/api/tma/convert', async (c) => {
  try {
    const body: { userId: string; points: number } = await c.req.json()
    const { userId, points } = body
    if (!userId || !points || points <= 0) return c.json({ error: 'Invalid request' }, 400)

    // Check user has enough points
    const user: any = await c.env.DB.prepare(
      'SELECT * FROM users WHERE id = ?'
    ).bind(userId).first()
    if (!user) return c.json({ error: 'User not found' }, 404)
    if (user.balance_points < points) return c.json({ error: 'Insufficient points' }, 400)

    const usd = points / POINTS_PER_USD
    const now = new Date().toISOString()

    // Deduct points, add USD
    await c.env.DB.prepare(
      'UPDATE users SET balance_points = balance_points - ?, balance_usd = balance_usd + ? WHERE id = ?'
    ).bind(points, usd, userId).run()

    // Create transaction
    const txId = crypto.randomUUID()
    await c.env.DB.prepare(
      'INSERT INTO transactions (id, user_id, type, amount_points, amount_usd, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(txId, userId, 'conversion', -points, usd, `Converted ${points} points → $${usd.toFixed(4)}`, now).run()

    return c.json({ success: true, usd })
  } catch (e) {
    console.error('/api/tma/convert error:', e)
    return c.json({ error: 'Server error' }, 500)
  }
})

// ─── 14. TMA Withdraw (Profit-First Safe Conditions) ─────────────────────────
app.post('/api/tma/withdraw', async (c) => {
  try {
    const body: { userId: string; amountUsd: number; network: string; walletAddress: string } = await c.req.json()
    const { userId, amountUsd, network, walletAddress } = body
    if (!userId || !amountUsd || amountUsd <= 0 || !network || !walletAddress) {
      return c.json({ error: 'برجاء استكمال كافة البيانات المطلوبة' }, 400)
    }

    // Check user balance and stats
    const user: any = await c.env.DB.prepare(
      'SELECT * FROM users WHERE id = ?'
    ).bind(userId).first()
    if (!user) return c.json({ error: 'المستخدم غير موجود' }, 404)

    // Check past completed withdrawals to determine minimum amount
    const prevWithdrawals: any = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM withdrawals WHERE user_id = ? AND status = "completed"'
    ).bind(userId).first()
    const isFirstWithdrawal = (prevWithdrawals?.count || 0) === 0
    const minRequired = isFirstWithdrawal ? 0.20 : 0.50

    // Condition 1: Minimum Withdrawal Amount
    if (amountUsd < minRequired) {
      return c.json({ error: `الحد الأدنى للسحب هو $${minRequired.toFixed(2)} USDT` }, 400)
    }

    if (user.balance_usd < amountUsd) {
      return c.json({ error: 'رصيدك بالدولار غير كافٍ لإجراء هذا السحب' }, 400)
    }

    // Condition 2: Active Referrals check (Minimum 3 referrals)
    const refCountObj: any = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM referrals WHERE referrer_id = ? AND level = 1'
    ).bind(userId).first()
    const activeRefs = refCountObj?.count || 0
    const MIN_REQUIRED_REFS = 3

    if (activeRefs < MIN_REQUIRED_REFS) {
      return c.json({
        error: `شرط الأمان المالي والأرباح: يلزم وجود 3 إحالات نشطة على الأقل لفتح طلبات السحب. (لديك حالياً: ${activeRefs}/${MIN_REQUIRED_REFS}). شارك رابط إحالتك للوصول للشرط!`
      }, 400)
    }

    // Condition 3: Secret Backend 3:1 Revenue Lock Algorithm
    const userAdRevenue = user.ad_revenue_usd || 0
    const userAdViews = user.ad_views_count || 0
    const userRecharges = user.recharge_count || 0
    const userTaps = user.tap_count || 0

    const estimatedUserRevenue = userAdRevenue + (userAdViews * 0.005) + (userRecharges * 0.01) + (userTaps * 0.0001)
    const requiredRevenue = amountUsd * 3.0
    const readinessPercent = Math.min(100, Math.floor((estimatedUserRevenue / Math.max(0.01, requiredRevenue)) * 100))

    if (readinessPercent < 100) {
      return c.json({
        error: `جاهزية خزينة القلعة للتحويل لم تكتمل بعد (${readinessPercent}%). قم بمسح الضباب والمشاركة في الغزوات الجماعية والمهام الإعلانية المأجورة لرفع الجاهزية إلى 100%!`
      }, 400)
    }

    const now = new Date().toISOString()
    const withdrawalId = crypto.randomUUID()

    // Deduct balance
    await c.env.DB.prepare(
      'UPDATE users SET balance_usd = balance_usd - ? WHERE id = ?'
    ).bind(amountUsd, userId).run()

    // Create withdrawal record with PENDING status for manual admin approval
    await c.env.DB.prepare(
      'INSERT INTO withdrawals (id, user_id, amount_usd, network, wallet_address, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(withdrawalId, userId, amountUsd, network, walletAddress, 'pending', now).run()

    // Create transaction
    const txId = crypto.randomUUID()
    await c.env.DB.prepare(
      'INSERT INTO transactions (id, user_id, type, amount_usd, description, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(txId, userId, 'withdrawal', -amountUsd, `طلب سحب $${amountUsd.toFixed(2)} عبر ${network} (قيد المراجعة)`, now).run()

    return c.json({ success: true, id: withdrawalId, message: 'تم إرسال طلب السحب بنجاح وهو الآن قيد المراجعة والموافقة اليدوية من الأدمن!' })
  } catch (e) {
    console.error('/api/tma/withdraw error:', e)
    return c.json({ error: 'Server error' }, 500)
  }
})

// ─── 15. TMA Withdrawal History ──────────────────────────────────────────────
app.get('/api/tma/withdrawals/:userId', async (c) => {
  try {
    const userId = c.req.param('userId')
    const withdrawals = await c.env.DB.prepare(
      'SELECT * FROM withdrawals WHERE user_id = ? ORDER BY created_at DESC LIMIT 100'
    ).bind(userId).all()
    return c.json(withdrawals.results)
  } catch (e) {
    return c.json({ error: 'DB Error' }, 500)
  }
})

// ─── 16. TMA Lucky Wheel ─────────────────────────────────────────────────────
app.post('/api/tma/lucky-wheel', async (c) => {
  try {
    const body: { userId: string } = await c.req.json()
    const { userId } = body
    if (!userId) return c.json({ error: 'Missing userId' }, 400)

    const now = new Date()
    const nowISO = now.toISOString()

    // Fetch user's last_lucky_wheel
    const user: any = await c.env.DB.prepare(
      'SELECT id, balance_points, last_lucky_wheel FROM users WHERE id = ?'
    ).bind(userId).first()
    if (!user) return c.json({ error: 'User not found' }, 404)

    // Check 24h cooldown
    if (user.last_lucky_wheel) {
      const lastSpin = new Date(user.last_lucky_wheel).getTime()
      const hoursSince = (now.getTime() - lastSpin) / (1000 * 60 * 60)
      if (hoursSince < 24) {
        const remainingHours = Math.ceil(24 - hoursSince)
        return c.json({
          success: false,
          canSpin: false,
          lastSpin: user.last_lucky_wheel,
          message: `You can spin again in ~${remainingHours}h`,
        })
      }
    }

    // Pick random prize
    const points = randomPrize()

    // Update user: add points, set last_lucky_wheel
    await c.env.DB.prepare(
      'UPDATE users SET balance_points = balance_points + ?, last_lucky_wheel = ? WHERE id = ?'
    ).bind(points, nowISO, userId).run()

    // Create transaction
    const txId = crypto.randomUUID()
    await c.env.DB.prepare(
      'INSERT INTO transactions (id, user_id, type, amount_points, description, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(txId, userId, 'lucky_wheel', points, `Lucky Wheel: +${points} points`, nowISO).run()

    return c.json({ success: true, points, canSpin: false, lastSpin: nowISO })
  } catch (e) {
    console.error('/api/tma/lucky-wheel error:', e)
    return c.json({ error: 'Server error' }, 500)
  }
})

// ─── 17. TMA Referrals ───────────────────────────────────────────────────────
app.get('/api/tma/referrals/:userId', async (c) => {
  try {
    const userId = c.req.param('userId')

    // Level 1 count (direct referrals)
    const level1: any = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM referrals WHERE referrer_id = ? AND level = 1'
    ).bind(userId).first()

    // Level 2 count (indirect referrals)
    const level2: any = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM referrals WHERE referrer_id = ? AND level = 2'
    ).bind(userId).first()

    // Total commission earned
    const earnings: any = await c.env.DB.prepare(
      'SELECT COALESCE(SUM(commission_earned), 0) as total FROM referrals WHERE referrer_id = ?'
    ).bind(userId).first()

    return c.json({
      level1Count: level1?.count ?? 0,
      level2Count: level2?.count ?? 0,
      totalEarnings: earnings?.total ?? 0,
    })
  } catch (e) {
    return c.json({ error: 'DB Error' }, 500)
  }
})

// ─── 18. TMA Claim Promo Code ───────────────────────────────────────────────
app.post('/api/tma/promo/claim', async (c) => {
  try {
    const body: { userId: string; code: string } = await c.req.json()
    const { userId, code } = body
    if (!userId || !code) return c.json({ error: 'Missing userId or code' }, 400)

    const cleanCode = code.trim().toUpperCase()

    // Find promo code
    const promo: any = await c.env.DB.prepare(
      'SELECT * FROM promo_codes WHERE code = ?'
    ).bind(cleanCode).first()

    if (!promo) {
      return c.json({ error: 'الرمز الترويجي غير صحيح أو غير موجود' }, 404)
    }

    if (promo.current_uses >= promo.max_uses) {
      return c.json({ error: 'انتهت الكمية المتاحة لهذا الرمز الترويجي' }, 400)
    }

    // Check if user already claimed this code
    const existing: any = await c.env.DB.prepare(
      'SELECT * FROM user_promo_claims WHERE user_id = ? AND code = ?'
    ).bind(userId, cleanCode).first()

    if (existing) {
      return c.json({ error: 'لقد قمت باستخدام هذا الرمز الترويجي من قبل!' }, 400)
    }

    const now = new Date().toISOString()
    const rewardPoints = promo.reward_points || 1000

    // Record user claim
    await c.env.DB.prepare(
      'INSERT INTO user_promo_claims (user_id, code, claimed_at) VALUES (?, ?, ?)'
    ).bind(userId, cleanCode, now).run()

    // Increment code uses
    await c.env.DB.prepare(
      'UPDATE promo_codes SET current_uses = current_uses + 1 WHERE code = ?'
    ).bind(cleanCode).run()

    // Add points to user balance
    await c.env.DB.prepare(
      'UPDATE users SET balance_points = balance_points + ? WHERE id = ?'
    ).bind(rewardPoints, userId).run()

    // Log transaction
    const txId = crypto.randomUUID()
    await c.env.DB.prepare(
      'INSERT INTO transactions (id, user_id, type, amount_points, description, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(txId, userId, 'promo_code', rewardPoints, `استخدام الرمز الترويجي: ${cleanCode}`, now).run()

    return c.json({ success: true, points: rewardPoints, message: `مبروك! تم إضافة ${rewardPoints} نقطة لرصيدك بنجاح 🎉` })
  } catch (e) {
    console.error('Promo claim error:', e)
    return c.json({ error: 'حدث خطأ في النظام' }, 500)
  }
})

// ─── 19. Admin Broadcast to Channel Endpoint ─────────────────────────────────
app.post('/api/admin/broadcast-channel', adminAuth, async (c) => {
  try {
    const body: { customMessage?: string; channel?: string } = await c.req.json()
    const result = await runScheduledChannelPost(c.env, body.customMessage, body.channel)
    return c.json({ success: true, telegramResult: result })
  } catch (e: any) {
    return c.json({ error: e.message || 'Error posting to channel' }, 500)
  }
})

// ─── 20. Admin Global Bot Broadcast Endpoint ─────────────────────────────────
app.post('/api/admin/broadcast-global', adminAuth, async (c) => {
  try {
    const body: { message: string } = await c.req.json()
    if (!body.message) return c.json({ error: 'Message required' }, 400)

    const token = c.env.BOT_TOKEN
    const appUrl = c.env.APP_URL || 'https://megaturboearn-platform-hfii.vercel.app'
    const users: any = await c.env.DB.prepare('SELECT id FROM users LIMIT 1000').all()

    let successCount = 0
    for (const u of users.results || []) {
      try {
        const res = await sendMessage(token, u.id, body.message, {
          inline_keyboard: [
            [{ text: '🚀 فتح القلعة ودخول الغزوات', web_app: { url: appUrl } }]
          ]
        })
        if (res && res.ok) successCount++
      } catch {}
    }

    return c.json({ success: true, count: successCount, total: users.results?.length || 0 })
  } catch (e: any) {
    return c.json({ error: e.message || 'Error executing global broadcast' }, 500)
  }
})

// ─── 21. Army & Ranks TMA Endpoints ─────────────────────────────────────────
app.get('/api/tma/army/my/:userId', async (c) => {
  try {
    const userId = c.req.param('userId')
    const user: any = await c.env.DB.prepare('SELECT army_id, army_rank FROM users WHERE id = ?').bind(userId).first()
    
    if (!user || !user.army_id) {
      return c.json({ inArmy: false })
    }

    const army: any = await c.env.DB.prepare('SELECT * FROM armies WHERE id = ?').bind(user.army_id).first()
    const members = await c.env.DB.prepare(
      `SELECT u.id, u.display_name, u.username, u.balance_points, u.army_rank, am.points_contributed
       FROM army_members am
       JOIN users u ON am.user_id = u.id
       WHERE am.army_id = ?
       ORDER BY am.joined_at ASC`
    ).bind(user.army_id).all()

    const raids = await c.env.DB.prepare(
      'SELECT * FROM raids WHERE army_id = ? AND status = "active" ORDER BY created_at DESC'
    ).bind(user.army_id).all()

    return c.json({
      inArmy: true,
      army,
      userRank: user.army_rank || 'Recruit',
      members: members.results || [],
      activeRaids: raids.results || []
    })
  } catch (e) {
    return c.json({ error: 'DB Error' }, 500)
  }
})

app.post('/api/tma/army/create', async (c) => {
  try {
    const body: { userId: string; name: string; logo?: string } = await c.req.json()
    const { userId, name, logo } = body
    if (!userId || !name) return c.json({ error: 'بيانات غير مكتملة' }, 400)

    const armyId = `army-${Date.now()}`
    const armyLogo = logo || '🛡️'

    await c.env.DB.prepare(
      'INSERT INTO armies (id, name, general_id, logo) VALUES (?, ?, ?, ?)'
    ).bind(armyId, name.trim(), userId, armyLogo).run()

    await c.env.DB.prepare(
      'INSERT INTO army_members (army_id, user_id, rank) VALUES (?, ?, "General")'
    ).bind(armyId, userId).run()

    await c.env.DB.prepare(
      'UPDATE users SET army_id = ?, army_rank = "General" WHERE id = ?'
    ).bind(armyId, userId).run()

    return c.json({ success: true, armyId, message: `🎉 تم تأسيس جيش "${name}" بنجاح وتعيينك قائداً أعلى!` })
  } catch (e) {
    return c.json({ error: 'DB Error' }, 500)
  }
})

app.post('/api/tma/army/join', async (c) => {
  try {
    const body: { userId: string; armyId: string } = await c.req.json()
    const { userId, armyId } = body
    if (!userId || !armyId) return c.json({ error: 'بيانات غير مكتملة' }, 400)

    const army: any = await c.env.DB.prepare('SELECT * FROM armies WHERE id = ?').bind(armyId).first()
    if (!army) return c.json({ error: 'الجيش غير موجود' }, 404)

    await c.env.DB.prepare(
      'INSERT OR REPLACE INTO army_members (army_id, user_id, rank) VALUES (?, ?, "Recruit")'
    ).bind(armyId, userId).run()

    await c.env.DB.prepare(
      'UPDATE users SET army_id = ?, army_rank = "Recruit" WHERE id = ?'
    ).bind(armyId, userId).run()

    return c.json({ success: true, message: `⚔️ انضممت بنجاح لجيش "${army.name}" رتبة مجند (Recruit)!` })
  } catch (e) {
    return c.json({ error: 'DB Error' }, 500)
  }
})

app.post('/api/tma/army/promote', async (c) => {
  try {
    const body: { generalId: string; targetUserId: string; newRank: string } = await c.req.json()
    const { generalId, targetUserId, newRank } = body

    const gen: any = await c.env.DB.prepare('SELECT army_id, army_rank FROM users WHERE id = ?').bind(generalId).first()
    if (!gen || gen.army_rank !== 'General') {
      return c.json({ error: 'صلاحيات غير كافية! القائد الأعلى فقط يمكنه تغيير الرتب.' }, 403)
    }

    await c.env.DB.prepare('UPDATE army_members SET rank = ? WHERE army_id = ? AND user_id = ?').bind(newRank, gen.army_id, targetUserId).run()
    await c.env.DB.prepare('UPDATE users SET army_rank = ? WHERE id = ?').bind(newRank, targetUserId).run()

    return c.json({ success: true, message: `👑 تم تغيير رتبة المقاتل إلى "${newRank}" بنجاح!` })
  } catch (e) {
    return c.json({ error: 'DB Error' }, 500)
  }
})

app.post('/api/tma/army/raid/create', async (c) => {
  try {
    const body: { userId: string; armyId: string; targetName?: string } = await c.req.json()
    const { userId, armyId, targetName } = body

    const raidId = `raid-${Date.now()}`
    const target = targetName || 'قلعة زعيم الظلال'

    await c.env.DB.prepare(
      'INSERT INTO raids (id, army_id, target_name, required_members, joined_count, reward_gold) VALUES (?, ?, ?, 5, 1, 50000)'
    ).bind(raidId, armyId, target).run()

    await c.env.DB.prepare(
      'INSERT INTO raid_participants (raid_id, user_id) VALUES (?, ?)'
    ).bind(raidId, userId).run()

    return c.json({ success: true, raidId, message: `💥 تم فتح الغزوة الجماعية ضد "${target}"! دعوة الأبطال للوصول لـ 5 مقاتلين للجني.` })
  } catch (e) {
    return c.json({ error: 'DB Error' }, 500)
  }
})

app.post('/api/tma/army/raid/join', async (c) => {
  try {
    const body: { userId: string; raidId: string } = await c.req.json()
    const { userId, raidId } = body

    const raid: any = await c.env.DB.prepare('SELECT * FROM raids WHERE id = ?').bind(raidId).first()
    if (!raid) return c.json({ error: 'الغزوة غير موجودة' }, 404)

    await c.env.DB.prepare('INSERT OR IGNORE INTO raid_participants (raid_id, user_id) VALUES (?, ?)').bind(raidId, userId).run()
    
    const countObj: any = await c.env.DB.prepare('SELECT COUNT(*) as count FROM raid_participants WHERE raid_id = ?').bind(raidId).first()
    const newCount = countObj?.count || 1

    await c.env.DB.prepare('UPDATE raids SET joined_count = ? WHERE id = ?').bind(newCount, raidId).run()

    if (newCount >= raid.required_members) {
      await c.env.DB.prepare('UPDATE raids SET status = "victory" WHERE id = ?').bind(raidId).run()
      
      // Award loot points to all participants
      const parts: any = await c.env.DB.prepare('SELECT user_id FROM raid_participants WHERE raid_id = ?').bind(raidId).all()
      const share = Math.floor(raid.reward_gold / Math.max(1, parts.results?.length || 1))

      for (const p of parts.results || []) {
        await c.env.DB.prepare('UPDATE users SET balance_points = balance_points + ? WHERE id = ?').bind(share, p.user_id).run()
      }

      return c.json({ success: true, victory: true, message: `🏆 انتصار ساحق! تم القضاء على "${raid.target_name}" وتوزيع غنائم ${share.toLocaleString()} ذهبة لكل بطل!` })
    }

    return c.json({ success: true, victory: false, message: `⚔️ انضممت للغزوة! المكتملين حالياً (${newCount}/${raid.required_members}).` })
  } catch (e) {
    return c.json({ error: 'DB Error' }, 500)
  }
})

app.post('/api/tma/morale/restore', async (c) => {
  try {
    const body: { userId: string } = await c.req.json()
    const { userId } = body
    if (!userId) return c.json({ error: 'userId required' }, 400)

    await c.env.DB.prepare('UPDATE users SET morale_percent = 100, ad_views_count = ad_views_count + 1 WHERE id = ?').bind(userId).run()
    return c.json({ success: true, message: '🍗 أقمت مأدبة النصر وتم استعادة معنويات الجيوش بالكامل (100%)!' })
  } catch (e) {
    return c.json({ error: 'DB Error' }, 500)
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// Automated 4-Hour Channel Promotional Poster & Scheduled Worker Entry
// ═══════════════════════════════════════════════════════════════════════════════
async function runScheduledChannelPost(env: Bindings, customMsg?: string, customChannel?: string) {
  const token = env.BOT_TOKEN || '8546533987:AAG_M_V48Jpn7zyMPYELIH9nX5cOmMNc-p8'
  const appUrl = env.APP_URL || 'https://megaturboearn-platform-hfii.vercel.app'
  const targetChannel = customChannel || '@MegaTurbo_world'

  // Generate dynamic promo code for this run
  const codeSuffix = Math.floor(1000 + Math.random() * 9000)
  const promoCode = `TURBO-${codeSuffix}`
  const pointsReward = 1500

  // Register promo code in DB
  if (env.DB) {
    try {
      await env.DB.prepare(
        `INSERT INTO promo_codes (code, reward_points, max_uses, current_uses) VALUES (?, ?, 500, 0)
         ON CONFLICT(code) DO UPDATE SET reward_points = EXCLUDED.reward_points`
      ).bind(promoCode, pointsReward).run()
    } catch (e) {
      console.warn('Error saving scheduled promo code:', e)
    }
  }

  // Pre-defined marketing templates
  const templates = [
    `🔥 <b>مكافأة السرعة والتعدين الفوري من MegaTurboEarn!</b>

✨ <b>رمز ترويجي جديد متاح لـ 500 مستخدم فقط:</b>
🎁 كود الهدية: <code>${promoCode}</code> (+1,500 نقطة ذهبية مجاناً!)

⚡️ <b>طرق الكسب السريع اليومية:</b>
• 📺 شاهد الإعلانات والفيديوهات المميزة
• 🎡 أدر عجلة الحظ اليومية واحصل على حتى 5,000 نقطة
• 👥 ادعُ أصدقاءك واكسب 10% + 3% من أرباحهم مدى الحياة

💵 <b>الحد الأدنى للسحب:</b> 0.20$ USDT فقط!
💳 <b>قناة إثباتات الدفع:</b> @MegaTurbo_payments`,

    `🚀 <b>اربح USDT فوراً ومن هاتفك مجاناً!</b>

💎 <b>الرمز الترويجي للساعات الـ 4 القادمة:</b>
🏷 الكود: <code>${promoCode}</code> (يعطيك 1,500 نقطة ذهبية مباشرة!)

🌟 <b>لماذا تختار MegaTurboEarn؟</b>
✅ سحوبات حقيقية ومباشرة عبر USDT (TRC20/BEP20/TON)
✅ حد أدنى منخفض جداً: $0.20 فقط
✅ نظام مهام متجدد كل ساعة بدون توقف

👇 <b>ادخل التطبيق الآن واستبدل الرمز الترويجي قبل انتهاء الكمية!</b>`,

    `🎁 <b>هدية نشاط الأعضاء والمعدنين!</b>

⚡️ استخدم الكود الترويجي التالي داخل تطبيق MegaTurboEarn للحصول على مكافأة فورية:
👉 <b>الكود الخاص:</b> <code>${promoCode}</code>

💰 <b>كيفية تحويل النقاط:</b>
10,000 نقطة = 1.00$ USDT
اسحب أرباحك فوراً فور وصولك لـ 0.20$!

📲 <b>اضغط على الزر بالأسفل لفتح التطبيق واستلام المكافأة:</b>`
  ]

  const messageText = customMsg || templates[Math.floor(Math.random() * templates.length)]

  return await sendMessage(token, targetChannel, messageText, {
    inline_keyboard: [
      [
        { text: '🚀 فتح تطبيق MegaTurboEarn واختيار الهدية', web_app: { url: appUrl } }
      ],
      [
        { text: '💳 قناة إثباتات الدفع والسحوبات', url: 'https://t.me/MegaTurbo_payments' }
      ]
    ]
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// Catch-all: serve static files & SPA routes via ASSETS binding
// ═══════════════════════════════════════════════════════════════════════════════
app.get('*', async (c) => {
  if (!c.env.ASSETS) {
    return c.text('ASSETS binding missing', 500)
  }
  try {
    const res = await c.env.ASSETS.fetch(c.req.raw)
    if (res.status === 404) {
      // SPA Fallback: serve /index.html
      const indexReq = new Request(new URL('/index.html', c.req.url))
      return await c.env.ASSETS.fetch(indexReq)
    }
    return res
  } catch (err) {
    console.error('Asset fetch error:', err)
    return c.text('Internal Server Error', 500)
  }
})

export default {
  fetch: app.fetch,
  async scheduled(event: any, env: Bindings, ctx: any) {
    if (ctx && ctx.waitUntil) {
      ctx.waitUntil(runScheduledChannelPost(env))
    } else {
      await runScheduledChannelPost(env)
    }
  }
}

