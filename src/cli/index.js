import { Command } from 'commander';
import crypto from 'crypto';
import AutomationEngine from '../core/engine.js';
import logger from '../utils/logger.js';
import chalk from 'chalk';
import boxen from 'boxen';

const program = new Command();

program
  .name('9router-automator')
  .version('4.0.0')
  .description('9Router-Kiro OAuth Automator with Enhanced Anti-Detection');

program
  .command('run')
  .description('Run the automation')
  .requiredOption('-e, --base-email <email>', 'Base Gmail address')
  .option('-m, --multiplier <number>', 'Number of accounts to create', '3')
  .option('-d, --use-dots', 'Use Gmail dot trick instead of +alias', false)
  .option('-i, --start-index <number>', 'Force start index manually')
  .option('-c, --cooldown <ms>', 'Cooldown between accounts (milliseconds)')
  .option('-p, --proxy <url>', 'Proxy server URL')
  .option('--skip-rate-limit', 'Skip rate limit check (dangerous)', false)
  .action(async (options) => {
    try {
      const engine = new AutomationEngine();
      await engine.initialize();

      await engine.run({
        baseEmail: options.baseEmail,
        multiplier: parseInt(options.multiplier, 10),
        useDots: options.useDots,
        startIndex: options.startIndex ? parseInt(options.startIndex, 10) : null,
        cooldown: options.cooldown ? parseInt(options.cooldown, 10) : null,
        proxy: options.proxy,
        skipRateLimit: options.skipRateLimit
      });

      process.exit(0);
    } catch (err) {
      logger.error('Command failed', { error: err.message });
      console.error(chalk.red('\nError: ') + err.message);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Show database status and statistics')
  .action(async () => {
    try {
      const db = (await import('../database/index.js')).default;
      await db.initialize();

      const providers = await db.getProviders({ limit: 100 });
      const active = providers.filter(p => p.status === 'active').length;
      const total = providers.length;

      console.log(boxen(
        chalk.bold.cyan('DATABASE STATUS') + '\n\n' +
        `Total Providers: ${chalk.green(total)}\n` +
        `Active: ${chalk.green(active)}\n` +
        `Inactive: ${chalk.yellow(total - active)}\n` +
        `Database: ${chalk.gray(db.dbPath)}`,
        { padding: 1, borderStyle: 'round', borderColor: 'cyan' }
      ));

      if (providers.length > 0) {
        console.log(chalk.bold('\nRecent providers:'));
        providers.slice(0, 10).forEach(p => {
          const status = p.status === 'active' ? chalk.green('✓') : chalk.red('✗');
          const date = new Date(p.created_at).toISOString().split('T')[0];
          console.log(`  ${status} ${p.email} (${date})`);
        });
      }

      await db.close();
      process.exit(0);
    } catch (err) {
      logger.error('Status command failed', { error: err.message });
      console.error(chalk.red('\nError: ') + err.message);
      process.exit(1);
    }
  });

program
  .command('logs')
  .description('Show recent automation logs')
  .option('-l, --limit <number>', 'Number of logs to show', '20')
  .option('-f, --failed-only', 'Show only failed attempts', false)
  .action(async (options) => {
    try {
      const db = (await import('../database/index.js')).default;
      await db.initialize();

      const sql = options.failedOnly
        ? 'SELECT * FROM automation_logs WHERE status != "success" ORDER BY created_at DESC LIMIT ?'
        : 'SELECT * FROM automation_logs ORDER BY created_at DESC LIMIT ?';

      const result = db.exec(sql, [parseInt(options.limit, 10)]);

      if (result.length === 0 || result[0].values.length === 0) {
        console.log(chalk.yellow('No logs found'));
        await db.close();
        process.exit(0);
      }

      console.log(chalk.bold.cyan('AUTOMATION LOGS\n'));

      const columns = result[0].columns;
      result[0].values.forEach(row => {
        const log = {};
        columns.forEach((col, i) => { log[col] = row[i]; });

        const status = log.status === 'success' ? chalk.green('✓') : chalk.red('✗');
        const date = new Date(log.created_at).toISOString().replace('T', ' ').split('.')[0];
        const duration = log.duration_ms ? `${log.duration_ms}ms` : 'N/A';

        console.log(`${status} ${log.email}`);
        console.log(`  ${chalk.gray(date)} | ${log.action} | ${duration}`);
        if (log.error_message) {
          console.log(`  ${chalk.red('Error:')} ${log.error_message}`);
        }
        console.log('');
      });

      await db.close();
      process.exit(0);
    } catch (err) {
      logger.error('Logs command failed', { error: err.message });
      console.error(chalk.red('\nError: ') + err.message);
      process.exit(1);
    }
  });

program
  .command('generate-key')
  .description('Generate a new encryption key')
  .action(() => {
    const key = crypto.randomBytes(32).toString('hex');

    console.log(boxen(
      chalk.bold.green('ENCRYPTION KEY GENERATED') + '\n\n' +
      chalk.yellow('Add this to your .env file:') + '\n\n' +
      chalk.white(`ENCRYPTION_KEY=${key}`) + '\n\n' +
      chalk.red('⚠️ Keep this secret! Do not commit to git.'),
      { padding: 1, borderStyle: 'double', borderColor: 'yellow', title: 'SECRET' }
    ));

    process.exit(0);
  });

program
  .command('backup')
  .description('Create database backup')
  .action(async () => {
    try {
      const db = (await import('../database/index.js')).default;
      await db.initialize();
      await db.createBackup();
      logger.success('Backup created');
      await db.close();
      process.exit(0);
    } catch (err) {
      logger.error('Backup failed', { error: err.message });
      console.error(chalk.red('\nError: ') + err.message);
      process.exit(1);
    }
  });

export default program;
