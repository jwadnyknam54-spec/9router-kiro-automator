import crypto from 'crypto';
import config from '../config/index.js';
import logger from './logger.js';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

export class SecurityManager {
  constructor() {
    this.encryptionKey = null;
  }

  initialize() {
    const key = config.get('security.encryptionKey');
    if (!key) {
      logger.warn('No encryption key configured - credential encryption disabled');
      return false;
    }

    try {
      this.encryptionKey = Buffer.from(key, 'hex');
      if (this.encryptionKey.length !== KEY_LENGTH) {
        throw new Error(`Encryption key must be ${KEY_LENGTH} bytes (64 hex chars)`);
      }
      return true;
    } catch (err) {
      logger.error('Failed to initialize encryption key', { error: err.message });
      return false;
    }
  }

  encrypt(plaintext) {
    if (!this.encryptionKey) {
      if (!this.initialize()) {
        throw new Error('Encryption key not configured');
      }
    }

    try {
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv(ALGORITHM, this.encryptionKey, iv);

      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      const result = Buffer.concat([
        iv,
        authTag,
        Buffer.from(encrypted, 'hex')
      ]).toString('base64');

      return result;
    } catch (err) {
      logger.error('Encryption failed', { error: err.message });
      throw new Error('Encryption failed');
    }
  }

  decrypt(ciphertext) {
    if (!this.encryptionKey) {
      if (!this.initialize()) {
        throw new Error('Encryption key not configured');
      }
    }

    try {
      const buffer = Buffer.from(ciphertext, 'base64');

      const iv = buffer.subarray(0, IV_LENGTH);
      const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
      const encrypted = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

      const decipher = crypto.createDecipheriv(ALGORITHM, this.encryptionKey, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return decrypted.toString('utf8');
    } catch (err) {
      logger.error('Decryption failed', { error: err.message });
      throw new Error('Decryption failed');
    }
  }

  hash(data, salt = null) {
    const actualSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(data, actualSalt, 100000, 64, 'sha512').toString('hex');
    return { hash, salt: actualSalt };
  }

  verifyHash(data, hash, salt) {
    const computed = this.hash(data, salt);
    return crypto.timingSafeEqual(Buffer.from(computed.hash), Buffer.from(hash));
  }

  generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  generateEncryptionKey() {
    return crypto.randomBytes(KEY_LENGTH).toString('hex');
  }

  sanitizeForLog(data) {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sanitized = { ...data };
    const sensitiveKeys = [
      'password',
      'token',
      'secret',
      'key',
      'credential',
      'auth',
      'access_token',
      'refresh_token'
    ];

    for (const key of Object.keys(sanitized)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some(s => lowerKey.includes(s))) {
        sanitized[key] = '***REDACTED***';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = this.sanitizeForLog(sanitized[key]);
      }
    }

    return sanitized;
  }
}

export default new SecurityManager();
