import config from '../config/index.js';
import db from '../database/index.js';
import logger from '../utils/logger.js';
import BrowserManager from '../browser/index.js';
import KiroOAuthAutomator from '../automation/index.js';
import { RateLimiter, AdaptiveCooldown } from '../utils/rate-limiter.js';
import { generateDotVariations, generatePlusVariations } from '../utils/gmail.js';
import { Validator, validateOptions } from '../utils/validation.js';
import chalk from 'chalk';
import boxen from 'boxen';

export class AutomationEngine {
  constructor() {
    this.browserManager = null;
    this.automator = null;
    this.rateLimiter = new RateLimiter();
    this.cooldown = new AdaptiveCooldown();
    this.results = {
      successful: [],
      failed: [],
      skipped: []
    };
  }

  async initialize() {
    logger.info('Initializing automation engine');

    config.load();

    logger.configure({
      level: config.get('logging.level'),
      console: config.get('logging.console'),
      file: config.get('logging.file'),
      filePath: config.get('logging.filePath'),
      format: config.get('logging.format')
    });

    await db.initialize();

    this.browserManager = new BrowserManager();
    this.automator = new KiroOAuthAutomator(this.browserManager);

    logger.success('Automation engine initialized');
  }

  async run(options) {
    const startTime = Date.now();

    try {
      const validated = this.validateOptions(options);

      this.printHeader(validated);

      const limit = await this.checkRateLimit();
      if (!limit.allowed) {
        throw new Error(
          `Rate limit exceeded. Reset in ${this.rateLimiter.getResetTimeString(limit.resetAt)}`
        );
      }

      const variations = await this.generateEmailVariations(validated);

      if (variations.length === 0) {
        throw new Error('No email variations generated');
      }

      const actualCount = Math.min(variations.length, limit.remaining);
      if (actualCount < variations.length) {
        logger.warn(`Rate limit allows only ${actualCount}/${variations.length} accounts today`);
        variations.splice(actualCount);
      }

      logger.success(`Processing ${variations.length} accounts`);

      await this.processAccounts(variations, validated);

      await this.browserManager.close();

      this.printSummary(startTime);

      return this.results;

    } catch (err) {
      logger.error('Automation failed', { error: err.message });
      throw err;
    } finally {
      await db.close();
    }
  }

  validateOptions(options) {
    const schema = {
      baseEmail: {
        type: 'string',
        required: true,
        custom: (v) => Validator.gmailAddress(v)
      },
      multiplier: {
        type: 'integer',
        required: false,
        min: 1,
        max: 50,
        default: 3,
        custom: (v) => Validator.multiplier(v)
      },
      useDots: {
        type: 'boolean',
        required: false,
        default: false
      },
      startIndex: {
        type: 'integer',
        required: false,
        min: 0,
        default: null
      },
      cooldown: {
        type: 'integer',
        required: false,
        min: 0,
        default: null,
        custom: (v) => Validator.cooldownDuration(v)
      },
      proxy: {
        type: 'proxy',
        required: false,
        default: null
      },
      skipRateLimit: {
        type: 'boolean',
        required: false,
        default: false
      }
    };

    return validateOptions(options, schema);
  }

  printHeader(options) {
    const mode = options.useDots ? 'Gmail Dot Trick' : 'Plus Alias (+kiro)';
    const cooldownMin = Math.floor((options.cooldown || this.cooldown.getCooldown()) / 60000);

    console.log(boxen(
      chalk.bold.green('9Router-Kiro Automator v4.0') + '\n' +
      chalk.bold.cyan(`Mode: ${mode}`) + '\n' +
      chalk.bold.magenta('Anti-Detection: Enhanced') + '\n' +
      chalk.gray(`Cooldown: ${cooldownMin}min | Accounts: ${options.multiplier}`),
      { padding: 1, margin: 1, borderStyle: 'double', borderColor: 'green' }
    ));
  }

  async checkRateLimit() {
    const limit = await this.rateLimiter.check('daily');

    if (!limit.allowed) {
      logger.error('Rate limit exceeded', {
        resetIn: this.rateLimiter.getResetTimeString(limit.resetAt)
      });
    } else if (limit.remaining < 5) {
      logger.warn(`Only ${limit.remaining} accounts remaining today`);
    }

    return limit;
  }

  async generateEmailVariations(options) {
    logger.step(1, 2, 'Generating email variations');

    let startIndex = options.startIndex;

    if (startIndex === null) {
      startIndex = await db.getNextKiroIndex(options.baseEmail);
      logger.info(`Auto-detected start index: ${startIndex}`);
    } else {
      logger.info(`Using forced start index: ${startIndex}`);
    }

    let variations;

    if (options.useDots) {
      variations = generateDotVariations(
        options.baseEmail,
        options.multiplier,
        startIndex
      );
    } else {
      variations = generatePlusVariations(
        options.baseEmail,
        options.multiplier,
        startIndex
      );
    }

    logger.success(`Generated ${variations.length} variations`);
    return variations;
  }

  async processAccounts(variations, options) {
    logger.step(2, 2, 'Processing accounts');

    for (let i = 0; i < variations.length; i++) {
      const email = variations[i];
      const isLast = i === variations.length - 1;

      logger.info(`[${i + 1}/${variations.length}] Processing: ${email}`);

      try {
        const result = await this.processAccount(email, {
          accountIndex: i,
          proxy: options.proxy
        });

        if (result.success) {
          this.results.successful.push(email);
          this.cooldown.recordSuccess();

          await db.logAutomation({
            email,
            action: 'oauth_link',
            status: 'success',
            durationMs: result.duration
          });

          logger.success(`✓ Linked: ${email}`);
        } else {
          this.results.failed.push({ email, error: 'Handshake timeout' });
          this.cooldown.recordFailure('timeout');

          await db.logAutomation({
            email,
            action: 'oauth_link',
            status: 'failed',
            errorMessage: 'Handshake timeout',
            durationMs: result.duration
          });

          logger.warn(`✗ Timeout: ${email}`);
        }

        if (!isLast) {
          await this.applyCooldown(options.cooldown);
        }

      } catch (err) {
        this.results.failed.push({ email, error: err.message });
        this.cooldown.recordFailure(err.message);

        await db.logAutomation({
          email,
          action: 'oauth_link',
          status: 'error',
          errorMessage: err.message
        });

        logger.error(`✗ Failed: ${email}`, { error: err.message });
      }
    }
  }

  async processAccount(email, options) {
    return await this.automator.createAccount(email, options);
  }

  async applyCooldown(manualCooldown = null) {
    const cooldownMs = manualCooldown || this.cooldown.getCooldown();
    const formatted = this.cooldown.formatCooldown(cooldownMs);

    logger.warn(`⏳ Cooldown: ${formatted}...`);
    logger.info('   (AWS detection prevention - slower = safer)');

    await new Promise(r => setTimeout(r, cooldownMs));
  }

  printSummary(startTime) {
    const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(2);

    console.log(boxen(
      chalk.bold.green('✅ AUTOMATION COMPLETE') + '\n\n' +
      `Successful: ${chalk.green(this.results.successful.length)}\n` +
      `Failed: ${chalk.red(this.results.failed.length)}\n` +
      `Skipped: ${chalk.yellow(this.results.skipped.length)}\n` +
      `Total Time: ${chalk.cyan(totalTime + ' min')}`,
      { padding: 1, borderStyle: 'round', borderColor: 'green' }
    ));

    if (this.results.failed.length > 0) {
      console.log(chalk.yellow('\nFailed accounts:'));
      this.results.failed.forEach(f => {
        console.log(`  ${chalk.red('✗')} ${f.email} — ${f.error}`);
      });
    }

    if (this.results.failed.some(f =>
      f.error.toLowerCase().includes('suspicious') ||
      f.error.toLowerCase().includes('abuse')
    )) {
      console.log(boxen(
        chalk.bold.yellow('⚠️ AWS ANTI-ABUSE DETECTED') + '\n\n' +
        'AWS detected automated activity.\n\n' +
        chalk.cyan('Recommendations:') + '\n' +
        '1. Increase cooldown (--cooldown 600000 for 10min)\n' +
        '2. Use proxy rotation\n' +
        '3. Reduce daily account creation (max 2-3)\n' +
        '4. Wait 24h before retrying\n' +
        '5. Use different browser profiles',
        { padding: 1, borderStyle: 'double', borderColor: 'yellow', title: 'DETECTION' }
      ));
    }
  }
}

export default AutomationEngine;
