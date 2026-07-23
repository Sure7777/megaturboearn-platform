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

// ─── Admin Auth Middleware ───────────────────────────────────────────────────
const adminAuth = async (c: any, next: any) => {
  const apiKey = c.req.header('X-Admin-API-Key')
  if (apiKey !== c.env.ADMIN_ID) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  await next()
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const POINTS_PER_USD = 1000 // 1000 points = 1 USD (also in settings table)
const MIN_WITHDRAWAL_USD = 0.20
const LUCKY_WHEEL_PRIZES = [5, 10, 20, 30, 50, 100, 200, 500]

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
    ])
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
    const appUrl = c.env.APP_URL

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

    // Welcome message
    const welcomeMsg = `
<b>🚀 مرحباً بك في MegaTurboEarn يا ${user.first_name}!</b>

⚡️ <b>اكسب المال من هاتفك بسهولة!</b>

💰 <b>طرق الكسب:</b>
• 📺 مشاهدة الإعلانات القصيرة والطويلة
• 📝 تنفيذ مهام القنوات والبوتات
• 👥 نظام إحالات مربح (مستويين)
• 🎡 عجلة الحظ اليومية
• 🎁 صندوق الهدايا اليومي

📊 <b>نظام النقاط:</b> 1000 نقطة = 1 دولار
💵 <b>الحد الأدنى للسحب:</b> 0.20 دولار

🔥 <b>اضغط الزر الأزرق أدناه لفتح التطبيق والبدء فوراً!</b>
    `

    // Single welcome message with web_app button only (no text keyboard)
    await sendMessage(token, chatId, welcomeMsg, {
      inline_keyboard: [
        [
          {
            text: '🚀 فتح تطبيق MegaTurboEarn',
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

// ─── 3. User API ─────────────────────────────────────────────────────────────
app.get('/api/user/:id', async (c) => {
  const id = c.req.param('id')
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first()
  if (!user) return c.json({ error: 'Not found' }, 404)
  return c.json(user)
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

// ─── 14. TMA Withdraw ────────────────────────────────────────────────────────
app.post('/api/tma/withdraw', async (c) => {
  try {
    const body: { userId: string; amountUsd: number; network: string; walletAddress: string } = await c.req.json()
    const { userId, amountUsd, network, walletAddress } = body
    if (!userId || !amountUsd || amountUsd <= 0 || !network || !walletAddress) {
      return c.json({ error: 'Missing required fields' }, 400)
    }

    // Minimum withdrawal check
    if (amountUsd < MIN_WITHDRAWAL_USD) {
      return c.json({ error: `Minimum withdrawal is $${MIN_WITHDRAWAL_USD}` }, 400)
    }

    // Check user balance
    const user: any = await c.env.DB.prepare(
      'SELECT * FROM users WHERE id = ?'
    ).bind(userId).first()
    if (!user) return c.json({ error: 'User not found' }, 404)
    if (user.balance_usd < amountUsd) return c.json({ error: 'Insufficient balance' }, 400)

    const now = new Date().toISOString()
    const withdrawalId = crypto.randomUUID()

    // Deduct balance
    await c.env.DB.prepare(
      'UPDATE users SET balance_usd = balance_usd - ? WHERE id = ?'
    ).bind(amountUsd, userId).run()

    // Create withdrawal record
    await c.env.DB.prepare(
      'INSERT INTO withdrawals (id, user_id, amount_usd, network, wallet_address, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(withdrawalId, userId, amountUsd, network, walletAddress, 'pending', now).run()

    // Create transaction
    const txId = crypto.randomUUID()
    await c.env.DB.prepare(
      'INSERT INTO transactions (id, user_id, type, amount_usd, description, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(txId, userId, 'withdrawal', -amountUsd, `Withdrawal $${amountUsd.toFixed(2)} via ${network}`, now).run()

    return c.json({ success: true, id: withdrawalId })
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

export default app
