import logger from '../utils/logger.js';
import readline from 'readline';

/**
 * Persistent Gmail session manager
 * Opens Gmail once and keeps it open throughout the automation session
 * Prevents login loops and maintains session state
 */
export class GmailSession {
  constructor(browserManager) {
    this.browserManager = browserManager;
    this.gmailPage = null;
    this.isLoggedIn = false;
    this.loginChecked = false;
  }

  /**
   * Initialize Gmail session - opens Gmail and verifies login
   * Call this ONCE at the start of automation
   */
  async initialize() {
    if (this.gmailPage && !this.gmailPage.isClosed()) {
      logger.debug('Gmail session already initialized');
      return;
    }

    logger.info('🌐 Initializing Gmail session...');

    const maxRetries = 2;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Create dedicated Gmail page that stays open
        this.gmailPage = await this.browserManager.newPage({
          antiDetection: true
        });

        // Navigate to Gmail (increased timeout for slow connections/heavy inboxes)
        await this.gmailPage.goto('https://mail.google.com/mail/u/0/#inbox', {
          waitUntil: 'domcontentloaded',
          timeout: 90000  // 90 seconds - Gmail can be slow to load
        });

        await this.gmailPage.waitForTimeout(3000);

        // Check login state
        await this.checkLoginState();

        if (!this.isLoggedIn) {
          logger.warn('⚠️ Gmail login required!');
          logger.warn('   Please login in the Gmail tab...');
          logger.warn('   ⏳ Waiting up to 3 minutes for login (email + password + 2FA)...');
          logger.warn('   💡 This is a ONE-TIME login for the entire session!');

          // Wait for login with multiple checks
          const loginSuccess = await this.waitForLogin(180000);

          if (!loginSuccess) {
            throw new Error('Gmail login timeout - please ensure you are logged into Gmail');
          }
        }

        logger.success('✅ Gmail session initialized and ready');
        return;

      } catch (err) {
        lastError = err;
        logger.warn(`Gmail initialization attempt ${attempt}/${maxRetries} failed:`, err.message);

        if (attempt < maxRetries) {
          logger.info('Retrying Gmail initialization...');
          await new Promise(r => setTimeout(r, 3000));
        }
      }
    }

    logger.error('Failed to initialize Gmail session after all attempts:', lastError.message);
    throw lastError;
  }

  /**
   * Check if user is logged into Gmail
   */
  async checkLoginState() {
    try {
      const currentUrl = this.gmailPage.url();

      // If on signin page, not logged in
      if (currentUrl.includes('/signin') || currentUrl.includes('/ServiceLogin')) {
        this.isLoggedIn = false;
        this.loginChecked = true;
        return false;
      }

      // Try to find Gmail UI elements
      const gmailElements = await Promise.race([
        this.gmailPage.$('div[role="main"]').catch(() => null),
        this.gmailPage.$('div.nH').catch(() => null),
        this.gmailPage.$('input[aria-label*="Search" i]').catch(() => null)
      ]);

      this.isLoggedIn = !!gmailElements;
      this.loginChecked = true;

      return this.isLoggedIn;

    } catch (err) {
      logger.debug('Login state check error:', err.message);
      this.isLoggedIn = false;
      return false;
    }
  }

  /**
   * Wait for user to complete Gmail login
   */
  async waitForLogin(timeoutMs = 180000) {
    const startTime = Date.now();
    const checkInterval = 5000;

    while (Date.now() - startTime < timeoutMs) {
      await this.gmailPage.waitForTimeout(checkInterval);

      const loggedIn = await this.checkLoginState();

      if (loggedIn) {
        logger.success('✅ Gmail login detected!');
        return true;
      }

      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      logger.debug(`Still waiting for Gmail login... (${elapsed}s elapsed)`);
    }

    return false;
  }

  /**
   * Get latest verification code from Gmail
   * This refreshes the existing Gmail page instead of navigating away
   * IMPORTANT: Only looks for emails from the last 5 minutes to avoid reading old codes
   */
  async getLatestVerificationCode(timeoutMs = 180000, allowManual = true) {
    if (!this.gmailPage) {
      throw new Error('Gmail session not initialized. Call initialize() first.');
    }

    // Record start time - we only want codes from emails received AFTER this point
    const searchStartTime = Date.now();
    const ACCEPTABLE_EMAIL_AGE_MS = 5 * 60 * 1000; // Only accept emails from last 5 minutes

    logger.info('📧 Scanning Gmail for NEW verification code (last 5 min)...');
    logger.info('⏰ Waiting 15 seconds for AWS to send the email...');

    // CRITICAL: Wait for AWS to actually send the email before we start scanning
    await this.gmailPage.waitForTimeout(15000);

    try {
      // Check if Gmail page is still alive
      if (this.gmailPage.isClosed()) {
        logger.warn('Gmail page was closed, reinitializing...');
        await this.initialize();
      }

      // Ensure we're on inbox
      const currentUrl = this.gmailPage.url();
      if (!currentUrl.includes('mail.google.com')) {
        logger.debug('Navigating back to Gmail inbox...');
        await this.gmailPage.goto('https://mail.google.com/mail/u/0/#inbox', {
          waitUntil: 'domcontentloaded',
          timeout: 60000  // Increased timeout
        });
        await this.gmailPage.waitForTimeout(2000);
      }

      const maxAttempts = Math.floor(timeoutMs / 5000);
      logger.info(`🔍 Will check Gmail ${maxAttempts} times (every 5s) - looking for FRESH emails only`);

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          // Refresh inbox IN PLACE (don't navigate away)
          logger.debug(`Attempt ${attempt}/${maxAttempts} - Refreshing...`);
          await this.gmailPage.reload({ waitUntil: 'domcontentloaded', timeout: 10000 });
          await this.gmailPage.waitForTimeout(2000);

          // Try multiple strategies to find verification code from RECENT emails only
          const code = await this.tryExtractCode(searchStartTime, ACCEPTABLE_EMAIL_AGE_MS);

          if (code) {
            logger.success(`✅ Verification code found: ${code}`);
            return code;
          }

          if (attempt % 6 === 0) {
            logger.progress(`Still scanning... (${attempt}/${maxAttempts} attempts)`);
          }

          await this.gmailPage.waitForTimeout(5000);

        } catch (err) {
          logger.debug(`Scan attempt ${attempt} error:`, err.message);
          await this.gmailPage.waitForTimeout(5000);
        }
      }

      // Auto-read failed, offer manual entry
      if (allowManual) {
        logger.warn('⚠️ Auto-read timeout. Please check Gmail and enter code manually.');
        return await this.askUserForCode();
      }

      throw new Error(`Verification code not found after ${maxAttempts} attempts`);

    } catch (err) {
      logger.error('Failed to get verification code:', err.message);

      if (allowManual) {
        logger.warn('⚠️ Error occurred. Please enter code manually.');
        return await this.askUserForCode();
      }

      throw err;
    }
  }

  /**
   * Try multiple strategies to extract verification code from Gmail
   * @param {number} searchStartTime - Timestamp when search started (only look for emails after this)
   * @param {number} acceptableAgeMs - Maximum age of email to accept (in milliseconds)
   */
  async tryExtractCode(searchStartTime, acceptableAgeMs) {
    // Strategy 1: Search for AWS emails
    let code = await this.strategyGmailSearch(searchStartTime, acceptableAgeMs);
    if (code) return code;

    // Strategy 2: Parse visible email rows (most reliable for recent emails)
    code = await this.strategyParseEmailRows(searchStartTime, acceptableAgeMs);
    if (code) return code;

    // Strategy 3: DOM inspection (last resort)
    code = await this.strategyDOMInspection();
    if (code) return code;

    return null;
  }

  async strategyGmailSearch() {
    try {
      logger.debug('Strategy 1: Gmail search...');

      const searchBox = await this.gmailPage.$('input[aria-label*="Search" i]').catch(() => null);
      if (searchBox) {
        await searchBox.fill('from:AWS subject:verification OR subject:verify');
        await this.gmailPage.keyboard.press('Enter');
        await this.gmailPage.waitForTimeout(3000);

        const firstEmail = await this.gmailPage.$('tr.zA:first-child, div[role="row"]:first-child').catch(() => null);
        if (firstEmail) {
          await firstEmail.click();
          await this.gmailPage.waitForTimeout(2000);

          const code = await this.extractCodeFromOpenEmail();

          // Go back to inbox for next search
          await this.gmailPage.goBack().catch(() => {
            this.gmailPage.goto('https://mail.google.com/mail/u/0/#inbox');
          });
          await this.gmailPage.waitForTimeout(1000);

          if (code) return code;
        }
      }
    } catch (err) {
      logger.debug('Strategy 1 failed:', err.message);
    }
    return null;
  }

  async strategyParseEmailRows(searchStartTime, acceptableAgeMs) {
    try {
      logger.debug('Strategy 2: Parsing email rows (RECENT emails only)...');

      const emailSelectors = [
        'tr.zA', 'div[role="row"]', 'tr[role="row"]',
        'div.Cp', 'tr.Wc', 'div[data-message-id]'
      ];

      let emails = [];
      for (const selector of emailSelectors) {
        emails = await this.gmailPage.$$(selector).catch(() => []);
        if (emails.length > 0) break;
      }

      if (emails.length === 0) return null;

      // Check first 15 emails (but prioritize recent ones)
      for (let i = 0; i < Math.min(15, emails.length); i++) {
        try {
          const email = emails[i];
          const emailText = await email.textContent().catch(() => '');

          // Check if email is relevant (AWS verification)
          const isRelevant =
            emailText.toLowerCase().includes('aws') ||
            emailText.toLowerCase().includes('amazon') ||
            emailText.toLowerCase().includes('verification') ||
            emailText.toLowerCase().includes('verify') ||
            emailText.toLowerCase().includes('builder id');

          if (!isRelevant) continue;

          // CRITICAL: Check if email is RECENT (not old)
          const isRecent =
            emailText.includes('just now') ||
            emailText.includes('minute ago') ||
            emailText.includes('minutes ago') ||
            emailText.match(/\d+\s*min/i) ||
            emailText.includes('now') ||
            // If no time indicator, it's at the top of inbox so probably recent
            i < 3;

          if (!isRecent) {
            logger.debug(`Skipping email ${i} - appears to be OLD (no recent timestamp)`);
            continue;
          }

          logger.debug(`Email ${i} appears RECENT - opening it...`);
          await email.click();
          await this.gmailPage.waitForTimeout(2500);

          const code = await this.extractCodeFromOpenEmail();

          if (code) {
            logger.success(`✅ Found FRESH verification code from recent email`);
            return code;
          }

          // Go back
          await this.gmailPage.goBack().catch(() => {
            this.gmailPage.goto('https://mail.google.com/mail/u/0/#inbox');
          });
          await this.gmailPage.waitForTimeout(1000);
        } catch (err) {
          continue;
        }
      }
    } catch (err) {
      logger.debug('Strategy 2 failed:', err.message);
    }
    return null;
  }

  async strategyDOMInspection() {
    try {
      logger.debug('Strategy 3: DOM inspection...');

      const bodyText = await this.gmailPage.textContent('body').catch(() => '');

      const codePatterns = [
        /verification\s+code[:\s]+([A-Z0-9]{6,8})/gi,
        /your\s+code[:\s]+([A-Z0-9]{6,8})/gi,
        /code[:\s]+([A-Z0-9]{6,8})/gi,
        /([A-Z0-9]{6})\s+is\s+your/gi,
        /\b([A-Z0-9]{6})\b/g,
        /\b([0-9]{6})\b/g
      ];

      for (const pattern of codePatterns) {
        const matches = [...bodyText.matchAll(pattern)];
        for (const match of matches) {
          if (match[1] && /^[A-Z0-9]{6,8}$/.test(match[1])) {
            const code = match[1];
            if (!this.isCommonFalsePositive(code)) {
              return code;
            }
          }
        }
      }
    } catch (err) {
      logger.debug('Strategy 3 failed:', err.message);
    }
    return null;
  }

  async extractCodeFromOpenEmail() {
    try {
      await this.gmailPage.waitForTimeout(2000);

      const bodySelectors = [
        'div[role="main"]', 'div.a3s.aiL', 'div.ii.gt',
        'div[data-message-id]', 'div.nH.if', 'body'
      ];

      let bodyText = '';
      for (const selector of bodySelectors) {
        const element = await this.gmailPage.$(selector).catch(() => null);
        if (element) {
          bodyText = await element.textContent().catch(() => '');
          if (bodyText.length > 50) break;
        }
      }

      if (!bodyText) {
        bodyText = await this.gmailPage.textContent('body').catch(() => '');
      }

      const codePatterns = [
        /verification\s+code[:\s]+([A-Z0-9]{6,8})/gi,
        /your\s+code[:\s]+([A-Z0-9]{6,8})/gi,
        /code\s+is[:\s]+([A-Z0-9]{6,8})/gi,
        /([A-Z0-9]{6})\s+is\s+your\s+verification/gi,
        /use\s+code[:\s]+([A-Z0-9]{6,8})/gi,
        /\b([A-Z0-9]{6})\b/g
      ];

      for (const pattern of codePatterns) {
        const matches = [...bodyText.matchAll(pattern)];
        for (const match of matches) {
          if (match[1] && /^[A-Z0-9]{6,8}$/.test(match[1])) {
            const code = match[1];
            if (!this.isCommonFalsePositive(code)) {
              return code;
            }
          }
        }
      }

      return null;

    } catch (err) {
      logger.debug('Error extracting code:', err.message);
      return null;
    }
  }

  isCommonFalsePositive(code) {
    const falsePositives = [
      '000000', '111111', '222222', '333333', '444444', '555555',
      '666666', '777777', '888888', '999999', '123456', '654321',
      'AAAAAA', 'ZZZZZZ', 'GOOGLE', 'GMAIL', 'AMAZON', 'UPDATE'
    ];
    return falsePositives.includes(code.toUpperCase());
  }

  async askUserForCode() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    return new Promise(resolve => {
      rl.question('\n📧 Enter verification code manually: ', code => {
        rl.close();
        resolve(code.trim());
      });
    });
  }

  /**
   * Close the Gmail session (call at end of automation)
   */
  async close() {
    if (this.gmailPage && !this.gmailPage.isClosed()) {
      await this.gmailPage.close().catch(() => {});
      logger.debug('Gmail session closed');
    }
    this.gmailPage = null;
    this.isLoggedIn = false;
    this.loginChecked = false;
  }
}

export default GmailSession;
