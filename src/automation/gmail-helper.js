import logger from '../utils/logger.js';
import readline from 'readline';

export class GmailHelper {
  constructor(page) {
    this.page = page;
    this.lastCheckedEmailCount = 0;
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

  async getLatestVerificationCode(timeoutMs = 180000, allowManual = true) {
    logger.info('Reading verification code from Gmail');

    try {
      // Navigate to Gmail
      logger.info('🌐 Navigating to Gmail...');
      await this.page.goto('https://mail.google.com/mail/u/0/#inbox', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      }).catch(err => {
        logger.warn('Gmail navigation warning:', err.message);
      });

      await this.page.waitForTimeout(3000);

      // Check if logged in
      const currentUrl = this.page.url();
      if (currentUrl.includes('/signin') || currentUrl.includes('/ServiceLogin')) {
        logger.warn('⚠️ Gmail login required! Please login in the browser...');
        logger.warn('   ⏳ Waiting 2 minutes for manual login (email + password + 2FA if needed)...');
        logger.warn('   💡 Take your time - no rush!');
        await this.page.waitForTimeout(120000);

        // Try reloading Gmail after login
        await this.page.goto('https://mail.google.com/mail/u/0/#inbox', {
          waitUntil: 'domcontentloaded'
        }).catch(() => {});
        await this.page.waitForTimeout(3000);
      }

      const maxAttempts = Math.floor(timeoutMs / 5000);
      logger.info(`🔍 Scanning Gmail for verification code (${maxAttempts} attempts, every 5s)`);

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          // Refresh inbox
          logger.debug(`Attempt ${attempt}/${maxAttempts} - Refreshing inbox...`);
          await this.page.reload({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
          await this.page.waitForTimeout(2000);

          // Try multiple strategies to find the verification email
          const code = await this.tryMultipleStrategies();

          if (code) {
            logger.success('✅ Verification code found:', code);
            return code;
          }

          logger.debug(`⏳ No code found yet (${attempt}/${maxAttempts}), waiting 5s...`);
          await this.page.waitForTimeout(5000);

        } catch (err) {
          logger.debug(`Scan attempt ${attempt} error:`, err.message);
          await this.page.waitForTimeout(5000);
        }
      }

      // Auto-read failed, offer manual entry
      if (allowManual) {
        logger.warn('⚠️ Gmail auto-read failed. Please enter code manually.');
        return await this.askUserForCode();
      }

      throw new Error('Verification code not found in Gmail after ' + maxAttempts + ' attempts');

    } catch (err) {
      logger.error('Failed to read Gmail:', err.message);

      if (allowManual) {
        logger.warn('⚠️ Gmail auto-read failed. Please enter code manually.');
        return await this.askUserForCode();
      }

      throw err;
    }
  }

  async tryMultipleStrategies() {
    // Strategy 1: Search for AWS emails directly using Gmail search
    let code = await this.strategyGmailSearch();
    if (code) return code;

    // Strategy 2: Parse visible email rows in the inbox
    code = await this.strategyParseEmailRows();
    if (code) return code;

    // Strategy 3: Use Gmail API-like approach via DOM inspection
    code = await this.strategyDOMInspection();
    if (code) return code;

    return null;
  }

  async strategyGmailSearch() {
    try {
      logger.debug('Strategy 1: Using Gmail search...');

      // Try to use search box
      const searchBox = await this.page.$('input[aria-label*="Search" i]').catch(() => null);
      if (searchBox) {
        await searchBox.fill('from:AWS subject:verification OR subject:verify');
        await this.page.keyboard.press('Enter');
        await this.page.waitForTimeout(3000);

        // Now try to read the first email
        const firstEmail = await this.page.$('tr.zA:first-child, div[role="row"]:first-child').catch(() => null);
        if (firstEmail) {
          await firstEmail.click();
          await this.page.waitForTimeout(2000);

          const code = await this.extractCodeFromOpenEmail();

          // Go back to inbox
          await this.page.goto('https://mail.google.com/mail/u/0/#inbox').catch(() => {});

          if (code) return code;
        }
      }
    } catch (err) {
      logger.debug('Strategy 1 failed:', err.message);
    }
    return null;
  }

  async strategyParseEmailRows() {
    try {
      logger.debug('Strategy 2: Parsing email rows...');

      // Try multiple selectors for email rows
      const emailSelectors = [
        'tr.zA',                    // Standard Gmail table row
        'div[role="row"]',          // Modern Gmail
        'tr[role="row"]',           // Alternative
        'div.Cp',                   // Compact view
        'tr.Wc',                    // Unread emails
        'div[data-message-id]'      // Message container
      ];

      let emails = [];
      for (const selector of emailSelectors) {
        emails = await this.page.$$(selector).catch(() => []);
        if (emails.length > 0) {
          logger.debug(`Found ${emails.length} emails using selector: ${selector}`);
          break;
        }
      }

      if (emails.length === 0) {
        logger.debug('No emails found with any selector');
        return null;
      }

      // Check first 15 emails
      const emailsToCheck = emails.slice(0, 15);

      for (let i = 0; i < emailsToCheck.length; i++) {
        try {
          const email = emailsToCheck[i];
          const emailText = await email.textContent().catch(() => '');

          // Look for AWS/verification related keywords
          const isRelevant =
            emailText.toLowerCase().includes('aws') ||
            emailText.toLowerCase().includes('amazon') ||
            emailText.toLowerCase().includes('verification') ||
            emailText.toLowerCase().includes('verify') ||
            emailText.toLowerCase().includes('builder id') ||
            emailText.toLowerCase().includes('code');

          if (isRelevant) {
            logger.debug(`Opening potentially relevant email ${i + 1}...`);

            await email.click();
            await this.page.waitForTimeout(3000);

            const code = await this.extractCodeFromOpenEmail();

            if (code) return code;

            // Go back
            await this.page.goBack().catch(() => {
              this.page.goto('https://mail.google.com/mail/u/0/#inbox');
            });
            await this.page.waitForTimeout(1500);
          }
        } catch (err) {
          logger.debug(`Error checking email ${i}:`, err.message);
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
      logger.debug('Strategy 3: Deep DOM inspection...');

      // Get all text content from page
      const bodyText = await this.page.textContent('body').catch(() => '');

      // Try to find verification codes directly in the page content
      const codePatterns = [
        /verification\s+code[:\s]+([A-Z0-9]{6,8})/gi,
        /your\s+code[:\s]+([A-Z0-9]{6,8})/gi,
        /code[:\s]+([A-Z0-9]{6,8})/gi,
        /([A-Z0-9]{6})\s+is\s+your/gi,
        /\b([A-Z0-9]{6})\b/g,
        /\b([0-9]{6})\b/g,
        /\b([A-Z0-9]{8})\b/g
      ];

      for (const pattern of codePatterns) {
        const matches = [...bodyText.matchAll(pattern)];
        for (const match of matches) {
          if (match[1] && /^[A-Z0-9]{6,8}$/.test(match[1])) {
            // Validate it's not a common non-code pattern
            const potentialCode = match[1];
            if (!this.isCommonFalsePositive(potentialCode)) {
              logger.debug('Found potential code via DOM inspection:', potentialCode);
              return potentialCode;
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
      // Wait for email body to load
      await this.page.waitForTimeout(2000);

      // Try multiple selectors for email body
      const bodySelectors = [
        'div[role="main"]',
        'div.a3s.aiL',
        'div.ii.gt',
        'div[data-message-id]',
        'div.nH.if',
        'body'
      ];

      let bodyText = '';
      for (const selector of bodySelectors) {
        const element = await this.page.$(selector).catch(() => null);
        if (element) {
          bodyText = await element.textContent().catch(() => '');
          if (bodyText.length > 50) break;
        }
      }

      if (!bodyText) {
        bodyText = await this.page.textContent('body').catch(() => '');
      }

      logger.debug('Email body length:', bodyText.length);

      // Enhanced code patterns with priority
      const codePatterns = [
        // High priority - explicit verification code patterns
        /verification\s+code[:\s]+([A-Z0-9]{6,8})/gi,
        /your\s+code[:\s]+([A-Z0-9]{6,8})/gi,
        /code\s+is[:\s]+([A-Z0-9]{6,8})/gi,

        // Medium priority - contextual patterns
        /([A-Z0-9]{6})\s+is\s+your\s+verification/gi,
        /use\s+code[:\s]+([A-Z0-9]{6,8})/gi,
        /enter\s+code[:\s]+([A-Z0-9]{6,8})/gi,

        // Lower priority - generic patterns
        /\bcode[:\s]+([A-Z0-9]{6})\b/gi,
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

      logger.debug('No verification code pattern matched in email body');
      return null;

    } catch (err) {
      logger.debug('Error extracting code from email:', err.message);
      return null;
    }
  }

  isCommonFalsePositive(code) {
    // Filter out common false positives
    const falsePositives = [
      '000000', '111111', '222222', '333333', '444444', '555555', '666666', '777777', '888888', '999999',
      '123456', '654321', 'AAAAAA', 'ZZZZZZ',
      'GOOGLE', 'GMAIL', 'AMAZON', 'UPDATE'
    ];

    return falsePositives.includes(code.toUpperCase());
  }

  // Alternative method: just open Gmail and let user handle it
  async openGmailForManualCheck() {
    try {
      await this.page.goto('https://mail.google.com/mail/u/0/#inbox', {
        waitUntil: 'domcontentloaded'
      });
      logger.success('Gmail opened - please check for verification code manually');
      return await this.askUserForCode();
    } catch (err) {
      logger.error('Failed to open Gmail:', err.message);
      throw err;
    }
  }
}

export default GmailHelper;
