-- MegaTurboEarn Platform - Advanced Database Schema (v2)
-- Support for TMA (Telegram Mini App), Adsgram, Streaks, and Leveling

-- 1. Users table (Extended)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, -- Telegram ID as string
    username TEXT,
    display_name TEXT,
    balance_points INTEGER DEFAULT 0,
    balance_usd REAL DEFAULT 0.0,
    level TEXT DEFAULT 'bronze', -- bronze, silver, gold, platinum
    referred_by TEXT,
    streak_count INTEGER DEFAULT 0,
    last_streak_date DATE,
    last_lucky_wheel DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_blocked INTEGER DEFAULT 0,
    is_admin INTEGER DEFAULT 0
);

-- 2. Ad Buttons/Groups table (3 groups for each type)
-- Type: short_ad, long_ad, task
CREATE TABLE IF NOT EXISTS ad_groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    order_index INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1
);

-- 3. Items (Ads/Tasks) table
-- linked to a group
CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- short, long, task
    reward_points INTEGER NOT NULL,
    url TEXT NOT NULL,
    daily_limit INTEGER DEFAULT 1,
    current_completions INTEGER DEFAULT 0,
    max_total_completions INTEGER DEFAULT 1000,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES ad_groups(id)
);

-- 4. User Item History (Prevent duplicates and track daily limits)
CREATE TABLE IF NOT EXISTS user_activity (
    user_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    type TEXT NOT NULL, -- ad_view, task_complete
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, item_id, completed_at)
);

-- 5. Referrals table (Two levels)
CREATE TABLE IF NOT EXISTS referrals (
    referrer_id TEXT NOT NULL,
    referred_id TEXT NOT NULL,
    level INTEGER NOT NULL, -- 1 or 2
    commission_earned REAL DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (referrer_id, referred_id)
);

-- 6. Withdrawals table
CREATE TABLE IF NOT EXISTS withdrawals (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    amount_usd REAL NOT NULL,
    network TEXT NOT NULL, -- TRC20, BEP20
    wallet_address TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, completed, rejected
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. Settings table (Key-Value)
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- 8. Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL, -- reward, conversion, withdrawal, commission
    amount_points INTEGER DEFAULT 0,
    amount_usd REAL DEFAULT 0.0,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Initial Core Settings
INSERT OR IGNORE INTO settings (key, value) VALUES ('points_to_usd_rate', '1000');
INSERT OR IGNORE INTO settings (key, value) VALUES ('user_profit_split', '50'); -- 50%
INSERT OR IGNORE INTO settings (key, value) VALUES ('owner_profit_split', '50'); -- 50%
INSERT OR IGNORE INTO settings (key, value) VALUES ('adsgram_base_url', 'https://api.adsgram.ai/v1');
INSERT OR IGNORE INTO settings (key, value) VALUES ('adsgram_api_key', '');
INSERT OR IGNORE INTO settings (key, value) VALUES ('min_withdrawal_usd', '0.20');
INSERT OR IGNORE INTO settings (key, value) VALUES ('withdrawal_fee_usd', '0.06');
INSERT OR IGNORE INTO settings (key, value) VALUES ('ref_level_1_pct', '10');
INSERT OR IGNORE INTO settings (key, value) VALUES ('ref_level_2_pct', '3');
INSERT OR IGNORE INTO settings (key, value) VALUES ('owner_hidden_commission_pct', '5');

-- Initial Levels Config (Multiplier for earnings)
INSERT OR IGNORE INTO settings (key, value) VALUES ('level_bronze_mult', '1.0');
INSERT OR IGNORE INTO settings (key, value) VALUES ('level_silver_mult', '1.1');
INSERT OR IGNORE INTO settings (key, value) VALUES ('level_gold_mult', '1.25');
INSERT OR IGNORE INTO settings (key, value) VALUES ('level_platinum_mult', '1.5');

-- Seed initial Groups (3 buttons for each)
INSERT OR IGNORE INTO ad_groups (id, name, type, order_index) VALUES ('sh1', 'الإعلانات القصيرة - المجموعة 1', 'short_ad', 1);
INSERT OR IGNORE INTO ad_groups (id, name, type, order_index) VALUES ('sh2', 'الإعلانات القصيرة - المجموعة 2', 'short_ad', 2);
INSERT OR IGNORE INTO ad_groups (id, name, type, order_index) VALUES ('sh3', 'الإعلانات القصيرة - المجموعة 3', 'short_ad', 3);

INSERT OR IGNORE INTO ad_groups (id, name, type, order_index) VALUES ('lo1', 'الإعلانات الطويلة - المجموعة 1', 'long_ad', 1);
INSERT OR IGNORE INTO ad_groups (id, name, type, order_index) VALUES ('lo2', 'الإعلانات الطويلة - المجموعة 2', 'long_ad', 2);
INSERT OR IGNORE INTO ad_groups (id, name, type, order_index) VALUES ('lo3', 'الإعلانات الطويلة - المجموعة 3', 'long_ad', 3);

INSERT OR IGNORE INTO ad_groups (id, name, type, order_index) VALUES ('ta1', 'المهام الكبرى - المجموعة 1', 'task', 1);
INSERT OR IGNORE INTO ad_groups (id, name, type, order_index) VALUES ('ta2', 'المهام الكبرى - المجموعة 2', 'task', 2);
INSERT OR IGNORE INTO ad_groups (id, name, type, order_index) VALUES ('ta3', 'المهام الكبرى - المجموعة 3', 'task', 3);
