import logger from '../utils/logger.js';

export class RetryManager {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.initialDelay = options.initialDelay || 1000;
    this.maxDelay = options.maxDelay || 30000;
    this.backoffMultiplier = options.backoffMultiplier || 2;
    this.retryableErrors = options.retryableErrors || [
      'timeout',
      'network',
      'ECONNREFUSED',
      'ETIMEDOUT'
    ];
  }

  async executeWithRetry(fn, context = '') {
    let lastError;
    let delay = this.initialDelay;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.debug('Executing with retry', { attempt, context });
        const result = await fn();

        if (attempt > 1) {
          logger.success('Retry successful', { attempt, context });
        }

        return { success: true, result, attempts: attempt };
      } catch (err) {
        lastError = err;

        const isRetryable = this.isRetryableError(err);
        const isLastAttempt = attempt === this.maxRetries;

        if (!isRetryable || isLastAttempt) {
          logger.error('Operation failed', {
            context,
            attempt,
            error: err.message,
            retryable: isRetryable
          });
          return { success: false, error: err, attempts: attempt };
        }

        logger.warn('Retryable error, will retry', {
          context,
          attempt,
          error: err.message,
          nextDelay: delay
        });

        await this.sleep(delay);
        delay = Math.min(delay * this.backoffMultiplier, this.maxDelay);
      }
    }

    return { success: false, error: lastError, attempts: this.maxRetries };
  }

  isRetryableError(error) {
    const errorMessage = error.message || '';
    const errorCode = error.code || '';

    return this.retryableErrors.some(pattern =>
      errorMessage.includes(pattern) || errorCode.includes(pattern)
    );
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000;
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.lastFailureTime = null;
  }

  async execute(fn, context = '') {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        logger.info('Circuit breaker half-open, attempting recovery', { context });
        this.state = 'HALF_OPEN';
      } else {
        const waitTime = Math.ceil((this.resetTimeout - (Date.now() - this.lastFailureTime)) / 1000);
        throw new Error(`Circuit breaker OPEN. Retry in ${waitTime}s`);
      }
    }

    try {
      const result = await fn();

      if (this.state === 'HALF_OPEN') {
        logger.success('Circuit breaker recovered', { context });
        this.state = 'CLOSED';
        this.failureCount = 0;
      }

      return result;
    } catch (err) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.failureCount >= this.failureThreshold) {
        this.state = 'OPEN';
        logger.error('Circuit breaker opened', {
          context,
          failures: this.failureCount,
          resetIn: `${this.resetTimeout / 1000}s`
        });
      }

      throw err;
    }
  }

  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.lastFailureTime = null;
    logger.info('Circuit breaker manually reset');
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime
    };
  }
}

export default { RetryManager, CircuitBreaker };
