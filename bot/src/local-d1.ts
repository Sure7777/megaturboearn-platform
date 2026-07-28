import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'

let localD1Instance: any = null

export function getLocalD1() {
  if (localD1Instance) return localD1Instance

  try {
    const dataDir = path.resolve(process.cwd(), '.data')
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }
    const dbPath = path.join(dataDir, 'local-dev.db')
    const sqlite = new DatabaseSync(dbPath)

    function createStatement(sql: string, boundArgs: any[] = []): any {
      return {
        bind(...args: any[]) {
          return createStatement(sql, args)
        },
        async first(colName?: string) {
          try {
            const stmt = sqlite.prepare(sql)
            const row: any = stmt.get(...boundArgs)
            if (!row) return null
            if (colName) return row[colName] ?? null
            return row
          } catch (e) {
            console.error('[LocalD1 Error first]:', sql, boundArgs, e)
            return null
          }
        },
        async all() {
          try {
            const stmt = sqlite.prepare(sql)
            const results = stmt.all(...boundArgs)
            return { results: results || [], success: true }
          } catch (e) {
            console.error('[LocalD1 Error all]:', sql, boundArgs, e)
            return { results: [], success: false }
          }
        },
        async run() {
          try {
            const stmt = sqlite.prepare(sql)
            const info = stmt.run(...boundArgs)
            return { success: true, meta: info }
          } catch (e) {
            console.error('[LocalD1 Error run]:', sql, boundArgs, e)
            return { success: false, meta: {} }
          }
        }
      }
    }

    localD1Instance = {
      prepare(sql: string) {
        return createStatement(sql)
      },
      async batch(statements: any[]) {
        const results = []
        for (const stmt of statements) {
          results.push(await stmt.run())
        }
        return results
      }
    }

    return localD1Instance
  } catch (err) {
    console.error('Failed to create local SQLite D1 instance:', err)
    return null
  }
}
