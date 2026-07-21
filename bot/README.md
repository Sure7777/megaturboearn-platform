# MegaTurboEarn Telegram Bot (Cloudflare Worker)

This is the code for the Telegram bot part of the platform.

## Deployment Instructions

1.  **Install Wrangler**:
    ```bash
    npm install -g wrangler
    ```

2.  **Login to Cloudflare**:
    ```bash
    wrangler login
    ```

3.  **Create D1 Database**:
    ```bash
    wrangler d1 create megaturboe-db
    ```
    Copy the `database_id` and paste it into `wrangler.toml`.

4.  **Initialize Database**:
    Run the SQL schema provided in the root directory:
    ```bash
    wrangler d1 execute megaturboe-db --file=../schema.sql
    ```

5.  **Set Secrets**:
    ```bash
    wrangler secret put BOT_TOKEN
    wrangler secret put ADMIN_ID
    ```

6.  **Deploy**:
    ```bash
    wrangler deploy
    ```


7.  **Set Webhook**:
    Replace `YOUR_WORKER_URL` with the URL provided after deployment:
    `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=<YOUR_WORKER_URL>/webhook`

## Bot Features
- Full Arabic support.
- Integration with Cloudflare D1.
- Dashboard-ready data structures.
- Multi-level referral system logic included.
