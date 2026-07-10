import logger from '../utils/logger.js';
import GmailHelper from './gmail-helper.js';
import DebugRecorder from '../utils/debug-recorder.js';
import { RetryManager } from '../utils/retry-manager.js';

export class AWSAutomator {
  constructor(page) {
    this.page = page;
    this.gmail = new GmailHelper(page);
    this.debugRecorder = new DebugRecorder(page);
    this.retryManager = new RetryManager({
      maxRetries: 3,
      initialDelay: 2000,
      maxDelay: 10000
    });
  }

  async autoRegister(email, name = null) {
    logger.info('Starting automated AWS Builder ID registration', { email });

    try {
      await this.page.goto('https://profile.aws.amazon.com/', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      await this.page.waitForTimeout(2000);

      const createButton = await this.findElement([
        'button:has-text("Create AWS Builder ID")',
        'button:has-text("Create")',
        'a:has-text("Create AWS Builder ID")'
      ]);

      if (createButton) {
        await createButton.click();
        logger.info('Clicked Create AWS Builder ID');
        await this.page.waitForTimeout(2000);
      }

      const emailInput = await this.findElement([
        'input[type="email"]',
        'input[name="email"]',
        'input[placeholder*="email" i]'
      ]);

      if (emailInput) {
        await emailInput.fill(email);
        logger.info('Filled email field');
        await this.page.waitForTimeout(500);
      }

      const nameInput = await this.findElement([
        'input[name="name"]',
        'input[placeholder*="name" i]',
        'input[type="text"]'
      ]);

      if (nameInput && name) {
        await nameInput.fill(name);
        logger.info('Filled name field');
      } else if (nameInput) {
        const generatedName = this.generateRandomName();
        await nameInput.fill(generatedName);
        logger.info('Filled name with generated value', { name: generatedName });
      }

      const continueButton = await this.findElement([
        'button:has-text("Continue")',
        'button[type="submit"]',
        'button:has-text("Next")'
      ]);

      if (continueButton) {
        await continueButton.click();
        logger.info('Clicked Continue button');
        await this.page.waitForTimeout(3000);
      }

      logger.info('📧 Waiting for verification code email (3 min timeout)');
      logger.warn('');
      logger.warn('💡 TIPS:');
      logger.warn('   • Make sure you\'re logged into Gmail in the browser');
      logger.warn('   • The system will auto-refresh and scan for AWS emails');
      logger.warn('   • If auto-read fails, you can enter the code manually');
      logger.warn('   • Check your Gmail inbox/spam for emails from AWS');
      logger.warn('');

      let verificationCode;
      try {
        verificationCode = await this.gmail.getLatestVerificationCode(180000, true);
      } catch (err) {
        logger.error('Failed to get verification code:', err.message);
        logger.error('');
        logger.error('Common issues:');
        logger.error('  • Gmail not logged in - login manually in the browser');
        logger.error('  • Email delayed - wait a few more minutes and check manually');
        logger.error('  • Email in spam folder - check Gmail spam/promotions');
        logger.error('  • Wrong email format - verify the email address is correct');
        throw new Error('Verification code retrieval failed. Check Gmail manually. Error: ' + err.message);
      }

      if (!verificationCode) {
        throw new Error('No verification code provided');
      }

      logger.success('Got verification code:', verificationCode);

      const codeInput = await this.findElement([
        'input[type="text"]',
        'input[name="code"]',
        'input[placeholder*="code" i]',
        'input[placeholder*="verification" i]'
      ], 5000);

      if (codeInput) {
        await codeInput.fill(verificationCode);
        logger.info('Filled verification code');
        await this.page.waitForTimeout(500);

        const verifyButton = await this.findElement([
          'button:has-text("Verify")',
          'button:has-text("Continue")',
          'button[type="submit"]'
        ]);

        if (verifyButton) {
          await verifyButton.click();
          logger.info('Clicked Verify button');
          await this.page.waitForTimeout(3000);
        }
      } else {
        logger.warn('⚠️ Code input field not found - verification may have auto-completed');
      }

      const passwordInput = await this.findElement([
        'input[type="password"]',
        'input[name="password"]'
      ], 5000);

      if (passwordInput) {
        const password = this.generateSecurePassword();
        await passwordInput.fill(password);
        logger.info('Filled password');

        const confirmPasswordInput = await this.findElement([
          'input[type="password"]:not(:first-of-type)',
          'input[name="confirmPassword"]',
          'input[name="password_confirm"]'
        ]);

        if (confirmPasswordInput) {
          await confirmPasswordInput.fill(password);
          logger.info('Filled password confirmation');
        }

        await this.page.waitForTimeout(500);

        const submitButton = await this.findElement([
          'button:has-text("Create")',
          'button:has-text("Continue")',
          'button[type="submit"]'
        ]);

        if (submitButton) {
          await submitButton.click();
          logger.info('Clicked submit button');
          await this.page.waitForTimeout(5000);
        }

        logger.info('Storing credentials', { email, password });
        return { email, password, success: true };
      }

      logger.success('AWS Builder ID registration completed');
      return { email, success: true };

    } catch (err) {
      logger.error('AWS automated registration failed', { error: err.message });
      throw err;
    }
  }

  async autoAuthorize(deviceCode) {
    logger.info('Starting automated authorization', { deviceCode });

    try {
      const authUrl = `https://view.awsapps.com/start/device?user_code=${deviceCode}`;
      await this.page.goto(authUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      await this.page.waitForTimeout(2000);

      const confirmButton = await this.findElement([
        'button:has-text("Confirm and continue")',
        'button:has-text("Confirm")',
        'button:has-text("Allow")',
        'button:has-text("Authorize")'
      ], 10000);

      if (confirmButton) {
        await confirmButton.click();
        logger.success('Auto-clicked authorization button');
        await this.page.waitForTimeout(2000);
        return true;
      }

      logger.warn('Authorization button not found');
      return false;

    } catch (err) {
      logger.error('Auto-authorization failed', { error: err.message });
      return false;
    }
  }

  async findElement(selectors, timeout = 3000) {
    for (const selector of selectors) {
      try {
        const element = await this.page.waitForSelector(selector, { timeout, state: 'visible' });
        if (element) return element;
      } catch (err) {
        continue;
      }
    }
    return null;
  }

  generateRandomName() {
    const firstNames = ['John', 'Jane', 'Alex', 'Sam', 'Chris', 'Jordan', 'Taylor', 'Morgan'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];

    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

    return `${firstName} ${lastName}`;
  }

  generateSecurePassword() {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnopqrstuvwxyz';
    const digits = '23456789';
    const special = '!@#$%^&*';

    let password = '';
    password += upper[Math.floor(Math.random() * upper.length)];
    password += lower[Math.floor(Math.random() * lower.length)];
    password += digits[Math.floor(Math.random() * digits.length)];
    password += special[Math.floor(Math.random() * special.length)];

    const all = upper + lower + digits + special;
    for (let i = 0; i < 12; i++) {
      password += all[Math.floor(Math.random() * all.length)];
    }

    return password.split('').sort(() => Math.random() - 0.5).join('');
  }
}

export default AWSAutomator;
