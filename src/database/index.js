import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import config from '../config/index.js';
import logger from '../utils/logger.js';

class DatabaseManager {
  constructor() {
    this.db = null;
    this.dbPath = null;
    this.SQL = null;
    this.isInitialized = false;
    this.transactionDepth = 0;
  }

  async initialize() {
    if (this.isInitialized) return;

    this.dbPath = config.get('database.path');
    const dbDir = path.dirname(this.dbPath);

    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      logger.info('Created database directory', { path: dbDir });
    }

    const init = initSqlJs.default || initSqlJs;
    this.SQL = await init();

    if (fs.existsSync(this.dbPath)) {
      await this.load();
    } else {
      this.db = new this.SQL.Database();
    }

    // Always run migrations to ensure schema is up-to-date
    await this.migrate();

    this.isInitialized = true;
    logger.info('Database initialized', { path: this.dbPath });
  }

  async load() {
    try {
      const buffer = fs.readFileSync(this.dbPath);
      this.db = new this.SQL.Database(buffer);
      logger.debug('Database loaded from disk');
    } catch (err) {
      logger.error('Failed to load database', { error: err.message });
      throw new Error(`Database load failed: ${err.message}`);
    }
  }

  async save() {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);

      if (config.get('database.backupEnabled')) {
        await this.createBackup();
      }

      const tempPath = this.dbPath + '.tmp';
      fs.writeFileSync(tempPath, buffer);

      if (fs.existsSync(this.dbPath)) {
        fs.unlinkSync(this.dbPath);
      }

      fs.renameSync(tempPath, this.dbPath);
      logger.debug('Database saved to disk');
    } catch (err) {
      logger.error('Failed to save database', { error: err.message });
      throw new Error(`Database save failed: ${err.message}`);
    }
  }

  async createBackup() {
    try {
      const backupDir = config.get('database.backupPath');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(backupDir, `data_${timestamp}.db`);

      if (fs.existsSync(this.dbPath)) {
        fs.copyFileSync(this.dbPath, backupPath);
        logger.info('Database backup created', { path: backupPath });

        this.cleanOldBackups(backupDir);
      }
    } catch (err) {
      logger.warn('Backup creation failed', { error: err.message });
    }
  }

  cleanOldBackups(backupDir, keepCount = 7) {
    try {
      const files = fs.readdirSync(backupDir)
        .filter(f => f.startsWith('data_') && f.endsWith('.db'))
        .map(f => ({
          name: f,
          path: path.join(backupDir, f),
          time: fs.statSync(path.join(backupDir, f)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time);

      if (files.length > keepCount) {
        files.slice(keepCount).forEach(f => {
          fs.unlinkSync(f.path);
          logger.debug('Old backup deleted', { path: f.path });
        });
      }
    } catch (err) {
      logger.warn('Backup cleanup failed', { error: err.message });
    }
  }

  async migrate() {
    logger.info('Running database migrations');

    this.db.run(`
      CREATE TABLE IF NOT EXISTS providers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL,
        provider_type TEXT NOT NULL DEFAULT 'kiro',
        access_token TEXT,
        refresh_token TEXT,
        expires_at INTEGER,
        status TEXT DEFAULT 'active',
        metadata TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        last_used_at INTEGER
      )
    `);

    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_providers_email
      ON providers(email)
    `);

    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_providers_status
      ON providers(status)
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS automation_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        provider_id INTEGER,
        email TEXT NOT NULL,
        action TEXT NOT NULL,
        status TEXT NOT NULL,
        error_message TEXT,
        metadata TEXT,
        duration_ms INTEGER,
        created_at INTEGER NOT NULL,
        FOREIGN KEY(provider_id) REFERENCES providers(id)
      )
    `);

    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_logs_email
      ON automation_logs(email)
    `);

    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_logs_created
      ON automation_logs(created_at)
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS rate_limits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        identifier TEXT NOT NULL UNIQUE,
        count INTEGER NOT NULL DEFAULT 0,
        window_start INTEGER NOT NULL,
        window_end INTEGER NOT NULL
      )
    `);

    await this.save();
    logger.info('Database migrations completed');
  }

  exec(sql, params = []) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const result = params.length > 0
        ? this.db.exec(sql, params)
        : this.db.exec(sql);
      return result;
    } catch (err) {
      logger.error('SQL execution failed', { sql, error: err.message });
      throw err;
    }
  }

  run(sql, params = []) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      this.db.run(sql, params);
    } catch (err) {
      logger.error('SQL run failed', { sql, error: err.message });
      throw err;
    }
  }

  async transaction(callback) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    this.transactionDepth++;

    try {
      if (this.transactionDepth === 1) {
        this.db.run('BEGIN TRANSACTION');
      }

      const result = await callback();

      if (this.transactionDepth === 1) {
        this.db.run('COMMIT');
        await this.save();
      }

      return result;
    } catch (err) {
      if (this.transactionDepth === 1) {
        this.db.run('ROLLBACK');
      }
      throw err;
    } finally {
      this.transactionDepth--;
    }
  }

  async getNextKiroIndex(baseEmail) {
    await this.initialize();

    const tableCheck = this.exec(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='providers'"
    );

    if (tableCheck.length === 0 || tableCheck[0].values.length === 0) {
      return 1;
    }

    const res = this.exec('SELECT email FROM providers');
    if (res.length === 0 || res[0].values.length === 0) {
      return 1;
    }

    const [prefix] = baseEmail.split('@');
    const cleanPrefix = prefix.replace(/\./g, '');
    let count = 0;

    for (const row of res[0].values) {
      const email = row[0];
      if (email && email.includes('@')) {
        const [rowPrefix] = email.split('@');
        const cleanRowPrefix = rowPrefix.replace(/\./g, '').split('+')[0];
        if (cleanRowPrefix.toLowerCase() === cleanPrefix.toLowerCase()) {
          count++;
        }
      }
    }

    return count + 1;
  }

  async addProvider(data) {
    await this.initialize();

    const now = Date.now();
    const metadata = data.metadata ? JSON.stringify(data.metadata) : null;

    return this.transaction(() => {
      this.run(
        `INSERT INTO providers (
          name, email, provider_type, access_token, refresh_token,
          expires_at, status, metadata, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.name,
          data.email,
          data.providerType || 'kiro',
          data.accessToken || null,
          data.refreshToken || null,
          data.expiresAt || null,
          data.status || 'active',
          metadata,
          now,
          now
        ]
      );

      const result = this.exec('SELECT last_insert_rowid()');
      return result[0].values[0][0];
    });
  }

  async updateProvider(id, data) {
    await this.initialize();

    const updates = [];
    const values = [];

    if (data.accessToken !== undefined) {
      updates.push('access_token = ?');
      values.push(data.accessToken);
    }
    if (data.refreshToken !== undefined) {
      updates.push('refresh_token = ?');
      values.push(data.refreshToken);
    }
    if (data.expiresAt !== undefined) {
      updates.push('expires_at = ?');
      values.push(data.expiresAt);
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }
    if (data.metadata !== undefined) {
      updates.push('metadata = ?');
      values.push(JSON.stringify(data.metadata));
    }

    updates.push('updated_at = ?');
    values.push(Date.now());

    values.push(id);

    return this.transaction(() => {
      this.run(
        `UPDATE providers SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
    });
  }

  async logAutomation(data) {
    await this.initialize();

    return this.transaction(() => {
      this.run(
        `INSERT INTO automation_logs (
          provider_id, email, action, status, error_message,
          metadata, duration_ms, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.providerId || null,
          data.email,
          data.action,
          data.status,
          data.errorMessage || null,
          data.metadata ? JSON.stringify(data.metadata) : null,
          data.durationMs || null,
          Date.now()
        ]
      );
    });
  }

  async checkRateLimit(identifier, maxCount, windowMs) {
    await this.initialize();

    const now = Date.now();
    const result = this.exec(
      'SELECT count, window_start, window_end FROM rate_limits WHERE identifier = ?',
      [identifier]
    );

    if (result.length === 0 || result[0].values.length === 0) {
      await this.transaction(() => {
        this.run(
          'INSERT INTO rate_limits (identifier, count, window_start, window_end) VALUES (?, ?, ?, ?)',
          [identifier, 1, now, now + windowMs]
        );
      });
      return { allowed: true, remaining: maxCount - 1, resetAt: now + windowMs };
    }

    const [count, windowStart, windowEnd] = result[0].values[0];

    if (now > windowEnd) {
      await this.transaction(() => {
        this.run(
          'UPDATE rate_limits SET count = 1, window_start = ?, window_end = ? WHERE identifier = ?',
          [now, now + windowMs, identifier]
        );
      });
      return { allowed: true, remaining: maxCount - 1, resetAt: now + windowMs };
    }

    if (count >= maxCount) {
      return { allowed: false, remaining: 0, resetAt: windowEnd };
    }

    await this.transaction(() => {
      this.run(
        'UPDATE rate_limits SET count = count + 1 WHERE identifier = ?',
        [identifier]
      );
    });

    return { allowed: true, remaining: maxCount - count - 1, resetAt: windowEnd };
  }

  async getProviders(filters = {}) {
    await this.initialize();

    let sql = 'SELECT * FROM providers WHERE 1=1';
    const params = [];

    if (filters.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.email) {
      sql += ' AND email LIKE ?';
      params.push(`%${filters.email}%`);
    }

    sql += ' ORDER BY created_at DESC';

    if (filters.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }

    const result = this.exec(sql, params);

    if (result.length === 0 || result[0].values.length === 0) {
      return [];
    }

    const columns = result[0].columns;
    return result[0].values.map(row => {
      const obj = {};
      columns.forEach((col, i) => {
        obj[col] = row[i];
      });
      if (obj.metadata) {
        try {
          obj.metadata = JSON.parse(obj.metadata);
        } catch (e) {
          obj.metadata = null;
        }
      }
      return obj;
    });
  }

  async close() {
    if (this.db) {
      await this.save();
      this.db.close();
      this.db = null;
      this.isInitialized = false;
      logger.info('Database closed');
    }
  }
}

export default new DatabaseManager();
