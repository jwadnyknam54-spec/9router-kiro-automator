#!/usr/bin/env node

import BrowserManager from '../src/browser/index.js';
import config from '../src/config/index.js';
import logger from '../src/utils/logger.js';
import chalk from 'chalk';

async function testConnection() {
  console.log(chalk.bold.cyan('🧪 Testing Chrome CDP Connection...\n'));

  try {
    // Load config
    config.load();

    // Configure logger
    logger.configure({
      level: 'info',
      console: true,
      file: false,
    });

    // Create browser manager
    const browserManager = new BrowserManager();

    console.log(chalk.gray('📡 Attempting to connect to Chrome...'));

    // Try to connect
    await browserManager.connect();

    console.log(chalk.green('✅ Successfully connected to Chrome via CDP!'));
    console.log(chalk.gray(`   CDP URL: ${config.get('browser.cdpUrl')}`));

    // Get browser info
    if (browserManager.browser) {
      const contexts = browserManager.browser.contexts();
      console.log(chalk.green(`   Active contexts: ${contexts.length}`));
    }

    // Try to create a test page
    console.log(chalk.gray('\n🌐 Testing page creation...'));
    const page = await browserManager.newPage();
    console.log(chalk.green('✅ Successfully created a new page!'));

    // Navigate to a simple test URL
    console.log(chalk.gray('🔗 Testing navigation...'));
    await page.goto('about:blank', { waitUntil: 'load', timeout: 5000 });
    console.log(chalk.green('✅ Successfully navigated to test URL!'));

    // Close test page
    await page.close();

    // Close browser connection
    await browserManager.close();

    console.log(chalk.bold.green('\n🎉 All tests passed! Chrome CDP connection is working properly.\n'));
    return true;

  } catch (err) {
    console.error(chalk.red('\n❌ Connection test failed:'));
    console.error(chalk.red(`   ${err.message}\n`));

    if (err.message.includes('ECONNREFUSED')) {
      console.log(chalk.yellow('💡 Troubleshooting tips:'));
      console.log(chalk.gray('   1. Make sure Chrome is running with: npm run chrome'));
      console.log(chalk.gray('   2. Or manually: chrome.exe --remote-debugging-port=9222'));
      console.log(chalk.gray('   3. Check if another process is using port 9222\n'));
    }

    return false;
  }
}

// Run test
testConnection().then((success) => {
  process.exit(success ? 0 : 1);
});
