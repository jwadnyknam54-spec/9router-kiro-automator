#!/usr/bin/env node

import { spawn } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import os from 'os';
import http from 'http';

const CHROME_DEBUG_PORT = 9222;
const USER_DATA_DIR = path.join(os.tmpdir(), '9router-chrome-debug');

function findChrome() {
  const possiblePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(os.homedir(), 'AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'),
  ];

  for (const chromePath of possiblePaths) {
    if (existsSync(chromePath)) {
      return chromePath;
    }
  }

  return null;
}

async function isChromeRunning() {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${CHROME_DEBUG_PORT}/json/version`, (res) => {
      resolve(res.statusCode === 200);
    });

    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function launchChrome() {
  console.log('🔍 Checking if Chrome is already running with CDP...');

  const isRunning = await isChromeRunning();
  if (isRunning) {
    console.log('✅ Chrome is already running with remote debugging on port', CHROME_DEBUG_PORT);
    return true;
  }

  console.log('🚀 Launching Chrome with remote debugging...');

  const chromePath = findChrome();
  if (!chromePath) {
    console.error('❌ Chrome not found. Please install Google Chrome.');
    return false;
  }

  console.log('📍 Chrome path:', chromePath);

  if (!existsSync(USER_DATA_DIR)) {
    mkdirSync(USER_DATA_DIR, { recursive: true });
  }

  const args = [
    `--remote-debugging-port=${CHROME_DEBUG_PORT}`,
    `--user-data-dir=${USER_DATA_DIR}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-default-apps',
    '--disable-sync',
    '--disable-translate',
  ];

  console.log('🔧 Launch args:', args.join(' '));

  const chromeProcess = spawn(chromePath, args, {
    detached: true,
    stdio: 'ignore',
    shell: false,
  });

  chromeProcess.unref();

  console.log('⏳ Waiting for Chrome to start...');

  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const ready = await isChromeRunning();
    if (ready) {
      console.log('✅ Chrome is ready! CDP available on port', CHROME_DEBUG_PORT);
      console.log('🌐 CDP endpoint: http://127.0.0.1:' + CHROME_DEBUG_PORT);
      return true;
    }
    process.stdout.write('.');
  }

  console.log('\n❌ Chrome failed to start within 15 seconds');
  return false;
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  launchChrome().then((success) => {
    process.exit(success ? 0 : 1);
  });
}

export { launchChrome, isChromeRunning };
