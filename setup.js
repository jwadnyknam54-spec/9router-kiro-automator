#!/usr/bin/env node

/**
 * 9Router-Kiro Automator - Interactive Setup Wizard
 *
 * This script provides a fully automated, interactive setup experience:
 * - Detects and launches Chrome with debugging
 * - Creates .env configuration interactively
 * - Auto-generates encryption keys
 * - Validates all settings
 * - Runs health checks
 * - Provides clear next steps
 */

import readline from 'readline';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawn } from 'child_process';
import os from 'os';
import chalk from 'chalk';
import boxen from 'boxen';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SetupWizard {
  constructor() {
    this.config = {};
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async run() {
    console.clear();
    this.printWelcome();

    try {
      await this.checkPrerequisites();
      await this.collectConfiguration();
      await this.generateEncryptionKey();
      await this.writeEnvFile();
      await this.setupChrome();
      await this.initializeDatabase();
      await this.runHealthChecks();
      await this.printSuccess();
    } catch (err) {
      console.error(chalk.red('\n❌ Setup failed:'), err.message);
      process.exit(1);
    } finally {
      this.rl.close();
    }
  }

  printWelcome() {
    console.log(boxen(
      chalk.bold.cyan('9Router-Kiro Automator') + '\n' +
      chalk.bold.green('Interactive Setup Wizard') + '\n\n' +
      chalk.gray('This wizard will configure your automation environment in 5 minutes.'),
      { padding: 1, margin: 1, borderStyle: 'double', borderColor: 'cyan' }
    ));
  }

  async question(prompt) {
    return new Promise(resolve => {
      this.rl.question(prompt, answer => resolve(answer.trim()));
    });
  }

  async confirm(prompt, defaultYes = true) {
    const suffix = defaultYes ? ' [Y/n]: ' : ' [y/N]: ';
    const answer = await this.question(prompt + suffix);

    if (!answer) return defaultYes;
    return answer.toLowerCase().startsWith('y');
  }

  async checkPrerequisites() {
    console.log(chalk.bold('\n📋 Step 1/7: Checking prerequisites...\n'));

    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

    if (majorVersion < 18) {
      throw new Error(`Node.js 18+ required (current: ${nodeVersion}). Please upgrade.`);
    }
    console.log(chalk.green('  ✓ Node.js'), nodeVersion);

    // Check if dependencies are installed
    if (!fs.existsSync(path.join(__dirname, 'node_modules'))) {
      console.log(chalk.yellow('  ⚠ Dependencies not installed'));
      const install = await this.confirm('Install dependencies now?');

      if (install) {
        console.log(chalk.gray('  Installing dependencies...'));
        await this.runCommand('npm', ['install']);
        console.log(chalk.green('  ✓ Dependencies installed'));
      } else {
        throw new Error('Dependencies required. Run: npm install');
      }
    } else {
      console.log(chalk.green('  ✓ Dependencies installed'));
    }

    // Check for existing .env
    if (fs.existsSync(path.join(__dirname, '.env'))) {
      console.log(chalk.yellow('  ⚠ .env file already exists'));
      const overwrite = await this.confirm('Overwrite existing configuration?', false);

      if (!overwrite) {
        throw new Error('Setup cancelled. Your existing .env was preserved.');
      }
    }
  }

  async collectConfiguration() {
    console.log(chalk.bold('\n⚙️  Step 2/7: Configuring automation...\n'));

    // 9Router Password
    console.log(chalk.cyan('9Router Configuration:'));
    this.config.ROUTER_PASSWORD = await this.question('  Enter your 9Router password: ');

    if (!this.config.ROUTER_PASSWORD) {
      throw new Error('9Router password is required');
    }

    this.config.ROUTER_URL = await this.question('  9Router URL [http://localhost:20128]: ');
    if (!this.config.ROUTER_URL) {
      this.config.ROUTER_URL = 'http://localhost:20128';
    }

    // Chrome Configuration
    console.log(chalk.cyan('\nChrome Configuration:'));
    this.config.CDP_URL = await this.question('  Chrome CDP URL [http://127.0.0.1:9222]: ');
    if (!this.config.CDP_URL) {
      this.config.CDP_URL = 'http://127.0.0.1:9222';
    }

    // Rate Limiting
    console.log(chalk.cyan('\nSafety Configuration:'));
    const maxAccounts = await this.question('  Max accounts per day [10]: ');
    this.config.MAX_ACCOUNTS_PER_DAY = maxAccounts || '10';

    // Logging
    const logLevel = await this.question('  Log level (debug/info/warn/error) [info]: ');
    this.config.LOG_LEVEL = logLevel || 'info';

    console.log(chalk.green('\n  ✓ Configuration collected'));
  }

  async generateEncryptionKey() {
    console.log(chalk.bold('\n🔐 Step 3/7: Generating encryption key...\n'));

    this.config.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');

    console.log(chalk.gray('  Generated 256-bit AES-GCM key'));
    console.log(chalk.green('  ✓ Encryption key ready'));
  }

  async writeEnvFile() {
    console.log(chalk.bold('\n📝 Step 4/7: Writing configuration file...\n'));

    const envContent = `# 9Router-Kiro Automator Configuration
# Generated: ${new Date().toISOString()}
# DO NOT COMMIT THIS FILE TO VERSION CONTROL!

# 9Router Configuration
ROUTER_URL=${this.config.ROUTER_URL}
ROUTER_PASSWORD=${this.config.ROUTER_PASSWORD}

# Browser Configuration
CDP_URL=${this.config.CDP_URL}

# Database Configuration
DB_PATH=~/.9router/data.db
DB_BACKUP_ENABLED=true
DB_BACKUP_PATH=~/.9router/backups

# Security Configuration
ENCRYPTION_KEY=${this.config.ENCRYPTION_KEY}

# Logging Configuration
LOG_LEVEL=${this.config.LOG_LEVEL}
LOG_DIR=./logs
LOG_CONSOLE=true
LOG_FILE=true
LOG_FORMAT=text

# Rate Limiting Configuration
MAX_ACCOUNTS_PER_DAY=${this.config.MAX_ACCOUNTS_PER_DAY}
RATE_LIMIT_WINDOW=86400000

# Anti-Detection Configuration
ANTI_DETECTION_ENABLED=true
CANVAS_NOISE=true
WEBGL_NOISE=true
AUDIO_NOISE=true
WEBRTC_PROTECTION=true
USER_AGENT_ROTATION=true

# Automation Configuration
DEFAULT_COOLDOWN=300000
ADAPTIVE_COOLDOWN=true
MAX_AUTH_ATTEMPTS=90
AUTH_POLL_INTERVAL=2000
`;

    fs.writeFileSync(path.join(__dirname, '.env'), envContent, 'utf8');
    console.log(chalk.green('  ✓ Configuration saved to .env'));
  }

  async setupChrome() {
    console.log(chalk.bold('\n🌐 Step 5/7: Setting up Chrome...\n'));

    const chromeRunning = await this.isChromeRunning();

    if (chromeRunning) {
      console.log(chalk.green('  ✓ Chrome is already running with debugging'));
      return;
    }

    const launch = await this.confirm('Launch Chrome with debugging now?');

    if (launch) {
      const { launchChrome } = await import('./scripts/launch-chrome.js');
      const success = await launchChrome();

      if (success) {
        console.log(chalk.green('  ✓ Chrome launched successfully'));
        console.log(chalk.gray('  💡 Please login to Gmail in the Chrome window'));
        await this.question('\n  Press Enter when you\'ve logged into Gmail...');
      } else {
        console.log(chalk.yellow('  ⚠ Auto-launch failed. Please start Chrome manually:'));
        console.log(chalk.gray('    npm run chrome'));
      }
    } else {
      console.log(chalk.yellow('  ⚠ You\'ll need to start Chrome manually before running automation:'));
      console.log(chalk.gray('    npm run chrome'));
    }
  }

  async initializeDatabase() {
    console.log(chalk.bold('\n💾 Step 6/7: Initializing database...\n'));

    try {
      // Create database directory
      const dbDir = path.join(os.homedir(), '.9router');
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      const backupDir = path.join(dbDir, 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      console.log(chalk.green('  ✓ Database directories created'));
      console.log(chalk.gray(`    Database: ${dbDir}/data.db`));
      console.log(chalk.gray(`    Backups: ${backupDir}`));
    } catch (err) {
      console.log(chalk.yellow('  ⚠ Database setup warning:'), err.message);
    }
  }

  async runHealthChecks() {
    console.log(chalk.bold('\n🏥 Step 7/7: Running health checks...\n'));

    const checks = [
      { name: '.env file', check: () => fs.existsSync('.env') },
      { name: 'Encryption key', check: () => this.config.ENCRYPTION_KEY.length === 64 },
      { name: '9Router password', check: () => this.config.ROUTER_PASSWORD.length > 0 },
      { name: 'Database directory', check: () => fs.existsSync(path.join(os.homedir(), '.9router')) }
    ];

    let allPassed = true;

    for (const { name, check } of checks) {
      const passed = check();
      if (passed) {
        console.log(chalk.green(`  ✓ ${name}`));
      } else {
        console.log(chalk.red(`  ✗ ${name}`));
        allPassed = false;
      }
    }

    if (!allPassed) {
      throw new Error('Some health checks failed. Please review configuration.');
    }

    console.log(chalk.green('\n  ✓ All health checks passed'));
  }

  async printSuccess() {
    console.log(boxen(
      chalk.bold.green('✅ Setup Complete!') + '\n\n' +
      chalk.white('Your 9Router-Kiro automation is ready to use.') + '\n\n' +
      chalk.bold.cyan('Next Steps:') + '\n' +
      chalk.gray('1. Ensure 9Router is running (http://localhost:20128)') + '\n' +
      chalk.gray('2. Make sure Chrome has Gmail logged in') + '\n' +
      chalk.gray('3. Run your first automation:') + '\n' +
      chalk.white('   npm start -- run -e your.email@gmail.com -m 1') + '\n\n' +
      chalk.bold.yellow('Important:') + '\n' +
      chalk.gray('• Start with 1 account to test the flow') + '\n' +
      chalk.gray('• Keep Chrome window open during automation') + '\n' +
      chalk.gray('• Check logs if issues occur: npm start -- logs'),
      { padding: 1, margin: 1, borderStyle: 'round', borderColor: 'green' }
    ));

    console.log(chalk.bold('\n📚 Useful Commands:\n'));
    console.log(chalk.cyan('  npm start -- run -e EMAIL -m COUNT') + chalk.gray('  # Run automation'));
    console.log(chalk.cyan('  npm start -- status') + chalk.gray('                  # Check database status'));
    console.log(chalk.cyan('  npm start -- logs') + chalk.gray('                    # View recent logs'));
    console.log(chalk.cyan('  npm start -- doctor') + chalk.gray('                  # Run diagnostics'));
    console.log(chalk.cyan('  npm start -- --help') + chalk.gray('                  # Show all commands'));
    console.log('');
  }

  async isChromeRunning() {
    return new Promise(resolve => {
      const http = (async () => (await import('http')).default)();
      http.then(h => {
        const req = h.get('http://127.0.0.1:9222/json/version', res => {
          resolve(res.statusCode === 200);
        });
        req.on('error', () => resolve(false));
        req.setTimeout(2000, () => {
          req.destroy();
          resolve(false);
        });
      });
    });
  }

  runCommand(command, args) {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args, { stdio: 'inherit', shell: true });
      proc.on('close', code => {
        if (code === 0) resolve();
        else reject(new Error(`Command failed with exit code ${code}`));
      });
      proc.on('error', reject);
    });
  }
}

// Run setup wizard
const wizard = new SetupWizard();
wizard.run().catch(err => {
  console.error(chalk.red('\n❌ Fatal error:'), err);
  process.exit(1);
});
