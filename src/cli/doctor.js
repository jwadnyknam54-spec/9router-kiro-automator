/**
 * Doctor Command - System Diagnostics and Health Checks
 *
 * Runs comprehensive health checks to diagnose issues:
 * - Environment configuration
 * - Chrome connectivity
 * - Database health
 * - 9Router connectivity
 * - Gmail accessibility
 * - Network connectivity
 */

import config from '../config/index.js';
import db from '../database/index.js';
import logger from '../utils/logger.js';
import chalk from 'chalk';
import boxen from 'boxen';
import http from 'http';
import { chromium } from 'playwright';

export class DoctorCommand {
  constructor() {
    this.results = {
      passed: [],
      failed: [],
      warnings: []
    };
  }

  async run() {
    console.log(boxen(
      chalk.bold.cyan('9Router-Kiro Health Check') + '\n' +
      chalk.gray('Running comprehensive diagnostics...'),
      { padding: 1, margin: 1, borderStyle: 'round', borderColor: 'cyan' }
    ));

    await this.checkEnvironment();
    await this.checkChrome();
    await this.checkDatabase();
    await this.check9Router();
    await this.checkNetwork();

    this.printReport();
  }

  async checkEnvironment() {
    console.log(chalk.bold('\n🔧 Environment Configuration\n'));

    // Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

    if (majorVersion >= 18) {
      this.pass(`Node.js ${nodeVersion}`);
    } else {
      this.fail(`Node.js ${nodeVersion} (requires 18+)`);
    }

    // .env file
    const fs = await import('fs');
    if (fs.existsSync('.env')) {
      this.pass('.env file exists');
    } else {
      this.fail('.env file missing - run: node setup.js');
      return;
    }

    // Required config values
    const requiredKeys = [
      'router.password',
      'router.url',
      'browser.cdpUrl'
    ];

    config.load();

    for (const key of requiredKeys) {
      const value = config.get(key);
      if (value) {
        this.pass(`Config: ${key}`);
      } else {
        this.fail(`Config: ${key} not set`);
      }
    }

    // Encryption key
    const encryptionKey = config.get('security.encryptionKey');
    if (encryptionKey && encryptionKey.length === 64) {
      this.pass('Encryption key configured');
    } else {
      this.warn('Encryption key missing or invalid');
    }

    // Dependencies
    if (fs.existsSync('node_modules')) {
      this.pass('Dependencies installed');
    } else {
      this.fail('Dependencies not installed - run: npm install');
    }
  }

  async checkChrome() {
    console.log(chalk.bold('\n🌐 Chrome Connectivity\n'));

    const cdpUrl = config.get('browser.cdpUrl') || 'http://127.0.0.1:9222';

    try {
      const isRunning = await this.testUrl(`${cdpUrl}/json/version`);

      if (isRunning) {
        this.pass('Chrome CDP accessible');

        // Test actual connection
        try {
          const browser = await chromium.connectOverCDP(cdpUrl, { timeout: 5000 });
          this.pass('Chrome CDP connection successful');
          await browser.close();
        } catch (err) {
          this.fail(`Chrome CDP connection failed: ${err.message}`);
        }
      } else {
        this.fail('Chrome not running with debugging - run: npm run chrome');
      }
    } catch (err) {
      this.fail(`Chrome check error: ${err.message}`);
    }
  }

  async checkDatabase() {
    console.log(chalk.bold('\n💾 Database Health\n'));

    try {
      await db.initialize();
      this.pass('Database initialized');

      const providers = await db.getProviders({ limit: 1 });
      this.pass(`Database accessible (${providers.length} sample records)`);

      await db.close();
    } catch (err) {
      this.fail(`Database error: ${err.message}`);
    }
  }

  async check9Router() {
    console.log(chalk.bold('\n🔌 9Router Connectivity\n'));

    const routerUrl = config.get('router.url') || 'http://localhost:20128';

    try {
      const accessible = await this.testUrl(routerUrl, 5000);

      if (accessible) {
        this.pass('9Router accessible');
      } else {
        this.fail('9Router not accessible - ensure it\'s running');
      }
    } catch (err) {
      this.fail(`9Router check error: ${err.message}`);
    }
  }

  async checkNetwork() {
    console.log(chalk.bold('\n🌍 Network Connectivity\n'));

    const testUrls = [
      { name: 'AWS Builder ID', url: 'https://profile.aws.amazon.com' },
      { name: 'Gmail', url: 'https://mail.google.com' }
    ];

    for (const { name, url } of testUrls) {
      try {
        const accessible = await this.testUrl(url, 5000);
        if (accessible) {
          this.pass(`${name} accessible`);
        } else {
          this.warn(`${name} not accessible (network issue?)`);
        }
      } catch (err) {
        this.warn(`${name} check error: ${err.message}`);
      }
    }
  }

  testUrl(url, timeout = 5000) {
    return new Promise(resolve => {
      const parsedUrl = new URL(url);
      const isHttps = parsedUrl.protocol === 'https:';
      const httpModule = isHttps ? (async () => (await import('https')).default)() : Promise.resolve(http);

      httpModule.then(h => {
        const req = h.get(url, { timeout }, res => {
          resolve(res.statusCode >= 200 && res.statusCode < 400);
        });

        req.on('error', () => resolve(false));
        req.on('timeout', () => {
          req.destroy();
          resolve(false);
        });
      });
    });
  }

  pass(message) {
    console.log(chalk.green('  ✓ ') + message);
    this.results.passed.push(message);
  }

  fail(message) {
    console.log(chalk.red('  ✗ ') + message);
    this.results.failed.push(message);
  }

  warn(message) {
    console.log(chalk.yellow('  ⚠ ') + message);
    this.results.warnings.push(message);
  }

  printReport() {
    console.log('\n' + '='.repeat(60) + '\n');

    const total = this.results.passed.length + this.results.failed.length + this.results.warnings.length;
    const score = Math.round((this.results.passed.length / total) * 100);

    let status, color;
    if (score >= 90) {
      status = 'Excellent';
      color = 'green';
    } else if (score >= 70) {
      status = 'Good';
      color = 'cyan';
    } else if (score >= 50) {
      status = 'Fair';
      color = 'yellow';
    } else {
      status = 'Poor';
      color = 'red';
    }

    console.log(boxen(
      chalk.bold[color](`Health Score: ${score}% (${status})`) + '\n\n' +
      chalk.green(`✓ Passed: ${this.results.passed.length}`) + '\n' +
      chalk.red(`✗ Failed: ${this.results.failed.length}`) + '\n' +
      chalk.yellow(`⚠ Warnings: ${this.results.warnings.length}`),
      { padding: 1, borderStyle: 'round', borderColor: color }
    ));

    if (this.results.failed.length > 0) {
      console.log(chalk.bold.red('\n❌ Critical Issues:\n'));
      this.results.failed.forEach(msg => console.log(chalk.red('  • ') + msg));
    }

    if (this.results.warnings.length > 0) {
      console.log(chalk.bold.yellow('\n⚠️  Warnings:\n'));
      this.results.warnings.forEach(msg => console.log(chalk.yellow('  • ') + msg));
    }

    if (this.results.failed.length === 0) {
      console.log(chalk.bold.green('\n✅ System is ready for automation!\n'));
      console.log(chalk.gray('Run: npm start -- run -e your.email@gmail.com -m 1\n'));
    } else {
      console.log(chalk.bold.yellow('\n⚠️  Please fix critical issues before running automation.\n'));
      console.log(chalk.gray('For help, see: TROUBLESHOOTING.md\n'));
    }
  }
}

export default DoctorCommand;
