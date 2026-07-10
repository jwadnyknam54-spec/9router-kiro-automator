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
      // Try to navigate to Gmail
      await this.page.goto('https://mail.google.com', {
        waitUntil: 'domcontentloaded',
        timeout: 20000
      }).catch(() => {
        logger.warn('Gmail navigation failed - will retry');
      });

      await this.page.waitForTimeout(3000);

      // Check if logged in
      const currentUrl = this.page.url();
      if (currentUrl.includes('/signin') || currentUrl.includes('/ServiceLogin')) {
        logger.warn('⚠️ Gmail login required! Please login in the browser...');
        logger.warn('   ⏳ Waiting 2 minutes for manual login (email + password + 2FA if needed)...');
        logger.warn('   💡 Take your time - no rush!');
        await this.page.waitForTimeout(120000);

        // Reload Gmail after login
        await this.page.goto('https://mail.google.com', {
          waitUntil: 'domcontentloaded'
        }).catch(() => {});
        await this.page.waitForTimeout(3000);
      }

      const maxAttempts = Math.floor(timeoutMs / 5000);
      logger.info(`🔍 Scanning Gmail for verification code (${maxAttempts} attempts, every 5s)`);

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          // Refresh inbox to get new emails
          await this.page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
          await this.page.waitForTimeout(2000);

          // Try multiple selectors for email rows
          const emailSelectors = [
            'tr.zA',           // Standard Gmail
            'tr[role="row"]',  // Alternative
            'div[role="row"]', // New Gmail UI
            'tr.Wc'            // Unread emails
          ];

          let emails = [];
          for (const selector of emailSelectors) {
            emails = await this.page.$$(selector);
            if (emails.length > 0) {
              logger.info(`Found ${emails.length} emails using selector: ${selector}`);
              break;
            }
          }

          if (emails.length === 0) {
            logger.warn(`No emails found (attempt ${attempt}/${maxAttempts})`);
            await this.page.waitForTimeout(5000);
            continue;
          }

          // Check first 10 emails
          const emailsToCheck = emails.slice(0, 10);

          for (const email of emailsToCheck) {
            try {
              // Get email text content
              const emailText = await email.textContent().catch(() => '');

              // Look for AWS-related emails
              if (
                emailText.includes('AWS') ||
                emailText.includes('Amazon') ||
                emailText.includes('verification') ||
                emailText.includes('verify') ||
                emailText.includes('code') ||
                emailText.includes('Builder ID')
              ) {
                logger.info('📧 Found potential verification email, opening...');

                await email.click();
                await this.page.waitForTimeout(3000);

                // Get email body content
                const bodySelectors = [
                  'div[role="main"]',
                  'div.a3s',
                  'div.ii',
                  'body'
                ];

                let bodyText = '';
                for (const selector of bodySelectors) {
                  const element = await this.page.$(selector);
                  if (element) {
                    bodyText = await element.textContent();
                    break;
                  }
                }

                if (!bodyText) {
                  bodyText = await this.page.textContent('body');
                }

                logger.info('📄 Email body length:', bodyText.length);

                // Enhanced code patterns
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
                      logger.success('✅ Verification code found:', match[1]);
                      return match[1];
                    }
                  }
                }

                logger.warn('❌ Email opened but no code pattern matched');

                // Go back to inbox
                await this.page.goBack().catch(() => {
                  this.page.goto('https://mail.google.com');
                });
                await this.page.waitForTimeout(1500);
              }
            } catch (err) {
              logger.debug('Error checking individual email:', err.message);
              continue;
            }
          }

          logger.warn(`⏳ No verification code found yet (${attempt}/${maxAttempts}), waiting...`);
          await this.page.waitForTimeout(5000);

        } catch (err) {
          logger.debug(`Gmail scan attempt ${attempt} failed:`, err.message);
          await this.page.waitForTimeout(5000);
        }
      }

      // If auto-read failed, offer manual entry
      if (allowManual) {
        logger.warn('⚠️ Auto-read failed. You can enter the code manually.');
        return await this.askUserForCode();
      }

      throw new Error('Verification code not found in Gmail after ' + maxAttempts + ' attempts');

    } catch (err) {
      logger.error('Failed to read Gmail:', err.message);

      // Fallback to manual entry
      if (allowManual) {
        logger.warn('⚠️ Gmail auto-read failed. Please enter code manually.');
        return await this.askUserForCode();
      }

      throw err;
    }
  }

  // Alternative method: just open Gmail and let user handle it
  async openGmailForManualCheck() {
    try {
      await this.page.goto('https://mail.google.com', {
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
