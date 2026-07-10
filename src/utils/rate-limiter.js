import config from '../config/index.js';
import db from '../database/index.js';
import logger from './logger.js';

export class RateLimiter {
  constructor() {
    this.enabled = config.get('security.rateLimiting.enabled');
    this.maxAccountsPerDay = config.get('security.rateLimiting.maxAccountsPerDay');
    this.trackingWindow = config.get('security.rateLimiting.trackingWindow');
  }

  async check(identifier = 'default') {
    if (!this.enabled) {
      return { allowed: true, remaining: Infinity, resetAt: null };
    }

    try {
      const result = await db.checkRateLimit(
        identifier,
        this.maxAccountsPerDay,
        this.trackingWindow
      );

      if (!result.allowed) {
        const resetDate = new Date(result.resetAt);
        logger.warn('Rate limit exceeded', {
          identifier,
          resetAt: resetDate.toISOString()
        });
      }

      return result;
    } catch (err) {
      logger.error('Rate limit check failed', { error: err.message });
      return { allowed: true, remaining: 0, resetAt: null };
    }
  }

  async increment(identifier = 'default') {
    if (!this.enabled) return;

    try {
      await this.check(identifier);
    } catch (err) {
      logger.error('Rate limit increment failed', { error: err.message });
    }
  }

  getResetTimeString(resetAt) {
    if (!resetAt) return 'unknown';

    const now = Date.now();
    const diff = resetAt - now;

    if (diff <= 0) return 'now';

    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }
}

export class AdaptiveCooldown {
  constructor() {
    this.minCooldown = config.get('automation.minCooldown');
    this.maxCooldown = config.get('automation.maxCooldown');
    this.defaultCooldown = config.get('automation.defaultCooldown');
    this.adaptive = config.get('automation.adaptiveCooldown');
    this.failureCount = 0;
    this.successCount = 0;
  }

  getCooldown() {
    if (!this.adaptive) {
      return this.defaultCooldown;
    }

    if (this.failureCount === 0 && this.successCount > 3) {
      return this.minCooldown;
    }

    if (this.failureCount > 2) {
      const multiplier = Math.min(this.failureCount, 5);
      return Math.min(this.defaultCooldown * multiplier, this.maxCooldown);
    }

    return this.defaultCooldown;
  }

  recordSuccess() {
    this.successCount++;
    this.failureCount = Math.max(0, this.failureCount - 1);
    logger.debug('Cooldown adjusted after success', {
      successCount: this.successCount,
      failureCount: this.failureCount,
      nextCooldown: this.getCooldown()
    });
  }

  recordFailure(reason = 'unknown') {
    this.failureCount++;
    this.successCount = 0;

    const isSuspicious = reason.toLowerCase().includes('suspicious') ||
                        reason.toLowerCase().includes('abuse') ||
                        reason.toLowerCase().includes('blocked');

    if (isSuspicious) {
      this.failureCount += 2;
    }

    logger.warn('Cooldown increased after failure', {
      reason,
      failureCount: this.failureCount,
      nextCooldown: this.getCooldown()
    });
  }

  reset() {
    this.failureCount = 0;
    this.successCount = 0;
  }

  formatCooldown(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }
}

export default new RateLimiter();
