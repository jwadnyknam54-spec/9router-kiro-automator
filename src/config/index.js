import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ConfigManager {
  constructor() {
    this.config = null;
    this.env = process.env.NODE_ENV || 'development';
    this.loadEnvFile();
  }

  loadEnvFile() {
    const envPath = path.join(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) {
      return;
    }

    try {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const lines = envContent.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const equalsIndex = trimmed.indexOf('=');
        if (equalsIndex === -1) continue;

        const key = trimmed.slice(0, equalsIndex).trim();
        const value = trimmed.slice(equalsIndex + 1).trim();

        if (key && !process.env[key]) {
          process.env[key] = value;
        }
      }
    } catch (err) {
      // Silently fail if .env can't be read
    }
  }

  load() {
    if (this.config) return this.config;

    const defaultConfigPath = path.join(__dirname, '../../config/default.json');
    const defaultConfig = JSON.parse(fs.readFileSync(defaultConfigPath, 'utf-8'));

    const envConfigPath = path.join(__dirname, `../../config/${this.env}.json`);
    const envConfig = fs.existsSync(envConfigPath)
      ? JSON.parse(fs.readFileSync(envConfigPath, 'utf-8'))
      : {};

    this.config = this.mergeDeep(defaultConfig, envConfig);
    this.applyEnvironmentVariables();
    this.expandPaths();
    this.validate();

    return this.config;
  }

  mergeDeep(target, source) {
    const output = { ...target };
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.mergeDeep(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    return output;
  }

  isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  applyEnvironmentVariables() {
    if (process.env.ROUTER_URL) this.config.router.url = process.env.ROUTER_URL;
    if (process.env.ROUTER_PASSWORD) this.config.router.password = process.env.ROUTER_PASSWORD;
    if (process.env.CDP_URL) this.config.browser.cdpUrl = process.env.CDP_URL;
    if (process.env.DB_PATH) this.config.database.path = process.env.DB_PATH;
    if (process.env.ENCRYPTION_KEY) this.config.security.encryptionKey = process.env.ENCRYPTION_KEY;
    if (process.env.LOG_LEVEL) this.config.logging.level = process.env.LOG_LEVEL;
    if (process.env.LOG_DIR) this.config.logging.filePath = path.join(process.env.LOG_DIR, 'app.log');
    if (process.env.MAX_ACCOUNTS_PER_DAY) {
      this.config.security.rateLimiting.maxAccountsPerDay = parseInt(process.env.MAX_ACCOUNTS_PER_DAY, 10);
    }
    if (process.env.FINGERPRINT_PROTECTION !== undefined) {
      this.config.antiDetection.fingerprintProtection = process.env.FINGERPRINT_PROTECTION === 'true';
    }
    if (process.env.CANVAS_NOISE !== undefined) {
      this.config.antiDetection.canvasNoiseEnabled = process.env.CANVAS_NOISE === 'true';
    }
    if (process.env.WEBGL_NOISE !== undefined) {
      this.config.antiDetection.webglNoiseEnabled = process.env.WEBGL_NOISE === 'true';
    }
    if (process.env.AUDIO_NOISE !== undefined) {
      this.config.antiDetection.audioNoiseEnabled = process.env.AUDIO_NOISE === 'true';
    }
  }

  expandPaths() {
    this.config.database.path = this.expandPath(this.config.database.path);
    if (this.config.database.backupPath) {
      this.config.database.backupPath = this.expandPath(this.config.database.backupPath);
    }
    this.config.logging.filePath = this.expandPath(this.config.logging.filePath);
  }

  expandPath(filePath) {
    if (filePath.startsWith('~/')) {
      return path.join(os.homedir(), filePath.slice(2));
    }
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
    return path.resolve(filePath);
  }

  validate() {
    const errors = [];

    // Skip validation for utility commands
    const command = process.argv[2];
    if (['generate-key', 'help', '--help', '-h', '--version', '-v'].includes(command)) {
      return;
    }

    if (!this.config.router.password && !process.env.ROUTER_PASSWORD) {
      errors.push('Router password is required. Set ROUTER_PASSWORD environment variable.');
    }

    if (this.config.security.encryptCredentials && !this.config.security.encryptionKey) {
      errors.push('Encryption key is required when credential encryption is enabled. Set ENCRYPTION_KEY environment variable.');
    }

    if (this.config.automation.minCooldown > this.config.automation.maxCooldown) {
      errors.push('Min cooldown cannot be greater than max cooldown.');
    }

    if (errors.length > 0) {
      throw new Error('Configuration validation failed:\n' + errors.join('\n'));
    }
  }

  get(key) {
    if (!this.config) this.load();
    const keys = key.split('.');
    let value = this.config;
    for (const k of keys) {
      if (value[k] === undefined) return undefined;
      value = value[k];
    }
    return value;
  }

  set(key, value) {
    if (!this.config) this.load();
    const keys = key.split('.');
    let current = this.config;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
  }
}

export default new ConfigManager();
