import fs from 'fs';
import path from 'path';
import util from 'util';
import chalk from 'chalk';

class Logger {
  constructor() {
    this.level = 'info';
    this.logToConsole = true;
    this.logToFile = false;
    this.logFilePath = null;
    this.format = 'text';
    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
      fatal: 4
    };
  }

  configure(options = {}) {
    this.level = options.level || 'info';
    this.logToConsole = options.console !== false;
    this.logToFile = options.file || false;
    this.format = options.format || 'text';

    if (this.logToFile && options.filePath) {
      this.logFilePath = options.filePath;
      const logDir = path.dirname(this.logFilePath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    }
  }

  shouldLog(level) {
    return this.levels[level] >= this.levels[this.level];
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();

    if (this.format === 'json') {
      return JSON.stringify({
        timestamp,
        level,
        message,
        ...meta
      });
    }

    let formatted = `[${timestamp}] [${level.toUpperCase()}]`;

    if (meta.context) {
      formatted += ` [${meta.context}]`;
    }

    formatted += ` ${message}`;

    if (Object.keys(meta).length > 0 && meta.context === undefined) {
      formatted += ` ${util.inspect(meta, { depth: 2, colors: this.logToConsole })}`;
    }

    return formatted;
  }

  writeToFile(message) {
    if (this.logToFile && this.logFilePath) {
      try {
        fs.appendFileSync(this.logFilePath, message + '\n', 'utf8');
      } catch (err) {
        console.error('Failed to write to log file:', err.message);
      }
    }
  }

  log(level, message, meta = {}) {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, message, meta);

    if (this.logToConsole) {
      const colorMap = {
        debug: chalk.gray,
        info: chalk.blue,
        warn: chalk.yellow,
        error: chalk.red,
        fatal: chalk.bgRed.white
      };

      const colorize = colorMap[level] || (s => s);
      console.log(colorize(formattedMessage));
    }

    this.writeToFile(formattedMessage);
  }

  debug(message, meta) {
    this.log('debug', message, meta);
  }

  info(message, meta) {
    this.log('info', message, meta);
  }

  warn(message, meta) {
    this.log('warn', message, meta);
  }

  error(message, meta) {
    this.log('error', message, meta);
  }

  fatal(message, meta) {
    this.log('fatal', message, meta);
  }

  success(message, meta) {
    if (this.logToConsole) {
      console.log(chalk.green('✔ ') + chalk.bold.green(message));
    }
    this.info(message, meta);
  }

  step(current, total, message, meta) {
    const formatted = `[${current}/${total}] ${message}`;
    if (this.logToConsole) {
      console.log(chalk.cyan(formatted));
    }
    this.info(formatted, meta);
  }

  progress(message, meta) {
    if (this.logToConsole) {
      console.log(chalk.gray('⏳ ') + message);
    }
    this.debug(message, meta);
  }
}

export default new Logger();
