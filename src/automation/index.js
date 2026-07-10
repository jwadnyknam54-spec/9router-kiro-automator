import config from '../config/index.js';
import logger from '../utils/logger.js';
import BrowserManager from '../browser/index.js';
import AWSAutomator from './aws-automator.js';

const ROUTER_URL = config.get('router.url');
const ROUTER_PASSWORD = config.get('router.password');
const MAX_AUTH_ATTEMPTS = config.get('automation.maxAuthAttempts');
const AUTH_POLL_INTERVAL = config.get('automation.authPollInterval');

export class KiroOAuthAutomator {
  constructor(browserManager = null) {
    this.browser = browserManager || new BrowserManager();
    this.routerUrl = ROUTER_URL;
    this.awsAutomator = null;
  }

  async handleRouterLogin(page) {
    try {
      const currentUrl = page.url();

      if (!currentUrl.includes('/login')) {
        return false;
      }

      logger.info('Router login page detected');

      await page.waitForSelector('input[type="password"]', { timeout: 5000 });
      await page.locator('input[type="password"]').first().fill(ROUTER_PASSWORD);

      const loginBtn = page.locator('button[type="submit"]').first();

      await Promise.race([
        loginBtn.click(),
        page.waitForNavigation({ timeout: 5000 }).catch(() => {})
      ]);

      await page.waitForTimeout(1500);

      logger.success('Router login successful');
      return true;
    } catch (err) {
      logger.warn('Router login failed', { error: err.message });
      return false;
    }
  }

  async waitForManualStep(page, step, instructions) {
    logger.info(`Manual step required: ${step}`);
    console.log('\n' + '='.repeat(60));
    console.log(`MANUAL STEP: ${step}`);
    console.log('='.repeat(60));
    console.log(instructions);
    console.log('='.repeat(60));
    console.log('\nPress [Enter] when complete...\n');

    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    await new Promise(resolve => {
      rl.question('', () => {
        rl.close();
        resolve();
      });
    });

    logger.success(`Manual step completed: ${step}`);
  }

  async createAccount(email, options = {}) {
    const {
      accountIndex = 0,
      proxy = null,
      userAgent = null,
      profileId = null
    } = options;

    const startTime = Date.now();

    logger.info('Starting OAuth flow', { email, accountIndex });

    try {
      await this.browser.connect();
      await this.browser.closeBackgroundTabs();
      await this.browser.clearSessions();

      logger.step(1, 3, 'AWS Builder ID Registration (Automated)');

      const regPage = await this.browser.newPage({
        proxy,
        userAgent,
        profileId: profileId ? `${profileId}-reg` : null
      });

      this.awsAutomator = new AWSAutomator(regPage);

      const regResult = await this.awsAutomator.autoRegister(email, 'User Name');

      if (regResult.password) {
        logger.info('Credentials saved for account', {
          email: regResult.email,
          hasPassword: true
        });
      }

      await regPage.close().catch(() => {});

      logger.step(2, 3, 'Generating Device Code');

      const page = await this.browser.newPage({
        proxy,
        userAgent,
        profileId: profileId ? `${profileId}-main` : null
      });

      await page.goto(`${this.routerUrl}/dashboard`, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      await this.handleRouterLogin(page);

      await page.goto(`${this.routerUrl}/dashboard/providers/kiro`, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      await page.waitForTimeout(2000);

      await page.locator('button:has-text("Add")').first().click();
      await page.waitForTimeout(1500);

      await page.locator('button:has(h3:has-text("AWS Builder ID"))').first().click();
      await page.waitForTimeout(4000);

      const bodyText = await page.textContent('body');
      const codeMatch = bodyText.match(/[A-Z0-9]{4}-[A-Z0-9]{4}/);

      if (!codeMatch) {
        throw new Error('Could not extract device code from 9Router popup');
      }

      const deviceCode = codeMatch[0];
      logger.success('Device code generated', { code: deviceCode });

      logger.step(3, 3, 'OAuth Handshake (Automated)');

      const authPage = await this.browser.context.newPage();
      this.awsAutomator = new AWSAutomator(authPage);

      const authSuccess = await this.awsAutomator.autoAuthorize(deviceCode);

      if (authSuccess) {
        logger.success('Auto-authorization successful');
      } else {
        logger.warn('Auto-authorization failed - device may require manual confirmation');
      }

      let authorized = false;
      let attempts = 0;

      while (attempts < MAX_AUTH_ATTEMPTS) {
        attempts++;

        try {
          const currentBody = await page.textContent('body', { timeout: 5000 });

          if (!currentBody.includes(deviceCode)) {
            authorized = true;
            break;
          }
        } catch (err) {
          logger.debug('Poll attempt failed', { attempt: attempts, error: err.message });
        }

        await page.waitForTimeout(AUTH_POLL_INTERVAL);

        if (attempts % 10 === 0) {
          logger.progress(`Polling router... (${attempts}/${MAX_AUTH_ATTEMPTS})`);
        }
      }

      if (authPage && !authPage.isClosed()) {
        await authPage.close().catch(() => {});
      }

      if (page && !page.isClosed()) {
        await page.close().catch(() => {});
      }

      const duration = Date.now() - startTime;

      if (authorized) {
        logger.success('OAuth flow completed', { email, duration: `${duration}ms` });
      } else {
        logger.warn('OAuth flow timed out', { email, attempts: MAX_AUTH_ATTEMPTS });
      }

      return {
        success: authorized,
        email,
        deviceCode,
        duration
      };

    } catch (err) {
      const duration = Date.now() - startTime;
      logger.error('OAuth flow failed', {
        email,
        error: err.message,
        duration: `${duration}ms`
      });

      throw err;
    }
  }

  async close() {
    await this.browser.close();
  }
}

export default KiroOAuthAutomator;
