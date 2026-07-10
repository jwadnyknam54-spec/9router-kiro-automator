import { chromium } from 'playwright';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { getAntiDetectionScript, getRandomUserAgent, generateRandomFingerprint } from './anti-detection.js';
import { launchChrome, isChromeRunning } from '../../scripts/launch-chrome.js';

export class BrowserManager {
  constructor() {
    this.browser = null;
    this.context = null;
    this.cdpUrl = config.get('browser.cdpUrl');
    this.isConnected = false;
    this.profiles = new Map();
  }

  async connect() {
    if (this.isConnected) return;

    // First, try to auto-launch Chrome if it's not running
    const isRunning = await isChromeRunning();
    if (!isRunning) {
      logger.info('Chrome not detected, attempting auto-launch...');
      const launched = await launchChrome();
      if (!launched) {
        throw new Error(
          'Failed to auto-launch Chrome. Please start Chrome manually with:\n' +
          'chrome.exe --remote-debugging-port=9222 --user-data-dir="chrome-debug"'
        );
      }
    }

    const maxAttempts = config.get('browser.connectionAttempts');
    const retryDelay = config.get('browser.connectionRetryDelay');

    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        logger.info('Connecting to Chrome CDP', { attempt, cdpUrl: this.cdpUrl });

        this.browser = await chromium.connectOverCDP(this.cdpUrl);
        const contexts = this.browser.contexts();
        this.context = contexts.length > 0 ? contexts[0] : this.browser;

        this.isConnected = true;
        logger.success('Connected to Chrome', { contexts: contexts.length });
        return;
      } catch (err) {
        lastError = err;
        logger.warn('CDP connection failed', { attempt, error: err.message });

        if (attempt < maxAttempts) {
          await new Promise(r => setTimeout(r, retryDelay));
        }
      }
    }

    logger.error('Failed to connect to Chrome after all attempts', {
      attempts: maxAttempts,
      error: lastError.message
    });

    const troubleshooting = [
      '1. Close all Chrome instances completely',
      '2. Run: npm run chrome',
      '3. Or manually: chrome.exe --remote-debugging-port=9222 --user-data-dir="chrome-debug"',
      '4. Verify Chrome is listening: http://localhost:9222/json/version'
    ].join('\n   ');

    throw new Error(
      `Chrome CDP connection failed after ${maxAttempts} attempts.\n\n` +
      `Last error: ${lastError.message}\n\n` +
      `Troubleshooting steps:\n   ${troubleshooting}`
    );
  }

  async newPage(options = {}) {
    if (!this.isConnected) {
      await this.connect();
    }

    const {
      proxy = null,
      userAgent = null,
      profileId = null,
      antiDetection = true
    } = options;

    const contextOptions = {};
    const fingerprint = generateRandomFingerprint();

    if (proxy) {
      contextOptions.proxy = { server: proxy };
      logger.debug('Using proxy for page', { proxy });
    }

    if (userAgent) {
      contextOptions.userAgent = userAgent;
    } else if (config.get('antiDetection.userAgentRotation')) {
      contextOptions.userAgent = getRandomUserAgent();
    }

    contextOptions.viewport = {
      width: fingerprint.screenWidth,
      height: fingerprint.screenHeight
    };

    contextOptions.locale = fingerprint.languages[0];
    contextOptions.timezoneId = fingerprint.timezone;

    let pageContext = this.context;

    if (Object.keys(contextOptions).length > 0 || profileId) {
      if (profileId && this.profiles.has(profileId)) {
        pageContext = this.profiles.get(profileId);
        logger.debug('Reusing browser profile', { profileId });
      } else {
        pageContext = await this.browser.newContext(contextOptions);

        if (profileId) {
          this.profiles.set(profileId, pageContext);
          logger.debug('Created new browser profile', { profileId });
        }
      }
    }

    const page = await pageContext.newPage();

    if (antiDetection && config.get('antiDetection.enabled')) {
      await this.applyAntiDetection(page, fingerprint);
    }

    logger.debug('Created new page', {
      userAgent: contextOptions.userAgent?.slice(0, 50),
      viewport: contextOptions.viewport,
      proxy: proxy ? 'enabled' : 'none'
    });

    return page;
  }

  async applyAntiDetection(page, fingerprint) {
    try {
      const antiDetectionConfig = {
        canvasNoiseEnabled: config.get('antiDetection.canvasNoiseEnabled'),
        webglNoiseEnabled: config.get('antiDetection.webglNoiseEnabled'),
        audioNoiseEnabled: config.get('antiDetection.audioNoiseEnabled'),
        webrtcProtection: config.get('antiDetection.webrtcProtection'),
        ...fingerprint
      };

      const script = getAntiDetectionScript(antiDetectionConfig);

      await page.addInitScript(script);
      logger.debug('Anti-detection applied', { fingerprint });
    } catch (err) {
      logger.warn('Failed to apply anti-detection', { error: err.message });
    }
  }

  async closeBackgroundTabs(keepUrls = []) {
    if (!this.context) return;

    try {
      const pages = this.context.pages();
      const defaultKeepUrls = ['localhost:20128', '127.0.0.1:20128'];
      const allKeepUrls = [...defaultKeepUrls, ...keepUrls];

      for (const page of pages) {
        const url = page.url();
        const shouldKeep = allKeepUrls.some(keepUrl => url.includes(keepUrl));

        if (!shouldKeep && pages.length > 1) {
          await page.close().catch(() => {});
          logger.debug('Closed background tab', { url });
        }
      }
    } catch (err) {
      logger.warn('Tab cleanup failed', { error: err.message });
    }
  }

  async clearSessions(domains = []) {
    if (!this.context) return;

    logger.info('Clearing browser sessions');

    try {
      await this.context.clearCookies().catch(() => {});

      const defaultDomains = [
        'https://view.awsapps.com',
        'https://signin.aws.amazon.com',
        'https://aws.amazon.com'
      ];

      const allDomains = [...new Set([...defaultDomains, ...domains])];

      const cleanPage = await this.context.newPage();

      for (const domain of allDomains) {
        try {
          await cleanPage.goto(domain, {
            waitUntil: 'domcontentloaded',
            timeout: 10000
          });

          await cleanPage.evaluate(() => {
            try {
              localStorage.clear();
              sessionStorage.clear();
            } catch (e) {}
          });

          logger.debug('Cleared storage for domain', { domain });
        } catch (err) {
          logger.debug('Could not clear storage', { domain, error: err.message });
        }

        await new Promise(r => setTimeout(r, 500));
      }

      await cleanPage.close().catch(() => {});
      logger.success('Session cleared');
    } catch (err) {
      logger.warn('Session clearing failed', { error: err.message });
    }
  }

  async closeProfile(profileId) {
    if (this.profiles.has(profileId)) {
      const context = this.profiles.get(profileId);
      await context.close().catch(() => {});
      this.profiles.delete(profileId);
      logger.info('Closed browser profile', { profileId });
    }
  }

  async close() {
    if (!this.browser) return;

    logger.info('Closing browser connection');

    try {
      for (const [profileId, context] of this.profiles.entries()) {
        await context.close().catch(() => {});
        logger.debug('Closed profile', { profileId });
      }
      this.profiles.clear();

      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.isConnected = false;

      logger.success('Browser closed');
    } catch (err) {
      logger.error('Browser close failed', { error: err.message });
    }
  }
}

export default BrowserManager;
