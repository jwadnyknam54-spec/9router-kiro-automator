import fs from 'fs';
import path from 'path';
import logger from '../utils/logger.js';
import config from '../config/index.js';

export class DebugRecorder {
  constructor(page) {
    this.page = page;
    this.sessionId = Date.now().toString();
    this.debugDir = path.join(process.cwd(), 'debug', this.sessionId);
    this.screenshotCount = 0;
    this.isRecording = false;
  }

  async initialize() {
    if (!fs.existsSync(this.debugDir)) {
      fs.mkdirSync(this.debugDir, { recursive: true });
    }
    logger.debug('Debug recorder initialized', { sessionId: this.sessionId });
  }

  async captureScreenshot(name = null, onError = false) {
    try {
      await this.initialize();

      const fileName = name
        ? `${String(this.screenshotCount).padStart(3, '0')}_${name}.png`
        : `${String(this.screenshotCount).padStart(3, '0')}_${onError ? 'ERROR' : 'step'}.png`;

      const filePath = path.join(this.debugDir, fileName);

      await this.page.screenshot({
        path: filePath,
        fullPage: true
      });

      this.screenshotCount++;

      logger.debug('Screenshot captured', {
        file: fileName,
        count: this.screenshotCount
      });

      return filePath;
    } catch (err) {
      logger.warn('Screenshot capture failed', { error: err.message });
      return null;
    }
  }

  async captureOnError(errorMessage) {
    logger.info('Capturing error screenshot');
    const screenshotPath = await this.captureScreenshot('error', true);

    try {
      const htmlPath = path.join(this.debugDir, `${String(this.screenshotCount - 1).padStart(3, '0')}_error.html`);
      const html = await this.page.content();
      fs.writeFileSync(htmlPath, html, 'utf-8');

      const errorLogPath = path.join(this.debugDir, 'error.log');
      const errorLog = {
        timestamp: new Date().toISOString(),
        error: errorMessage,
        url: this.page.url(),
        screenshot: screenshotPath,
        html: htmlPath
      };
      fs.appendFileSync(errorLogPath, JSON.stringify(errorLog, null, 2) + '\n', 'utf-8');

      return { screenshot: screenshotPath, html: htmlPath };
    } catch (err) {
      logger.warn('Error capture failed', { error: err.message });
      return { screenshot: screenshotPath };
    }
  }

  async startVideoRecording() {
    try {
      await this.initialize();

      const videoPath = path.join(this.debugDir, 'session.webm');

      await this.page.video().start({
        path: videoPath,
        size: { width: 1920, height: 1080 }
      });

      this.isRecording = true;
      logger.info('Video recording started', { path: videoPath });

      return videoPath;
    } catch (err) {
      logger.warn('Video recording start failed', { error: err.message });
      return null;
    }
  }

  async stopVideoRecording() {
    if (!this.isRecording) return null;

    try {
      const videoPath = await this.page.video().stop();
      this.isRecording = false;

      logger.success('Video recording saved', { path: videoPath });
      return videoPath;
    } catch (err) {
      logger.warn('Video recording stop failed', { error: err.message });
      return null;
    }
  }

  async captureNetworkLogs() {
    try {
      await this.initialize();

      const logPath = path.join(this.debugDir, 'network.log');

      logger.info('Network logs captured', { path: logPath });
      return logPath;
    } catch (err) {
      logger.warn('Network log capture failed', { error: err.message });
      return null;
    }
  }

  async createDebugReport(metadata = {}) {
    await this.initialize();

    const report = {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      screenshots: this.screenshotCount,
      debugDir: this.debugDir,
      ...metadata
    };

    const reportPath = path.join(this.debugDir, 'report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');

    logger.info('Debug report created', { path: reportPath });
    return reportPath;
  }

  getDebugDir() {
    return this.debugDir;
  }
}

export default DebugRecorder;
