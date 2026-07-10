import { EventEmitter } from 'events';
import logger from '../utils/logger.js';
import pLimit from 'p-limit';

export class ParallelExecutor extends EventEmitter {
  constructor(options = {}) {
    super();
    this.concurrency = options.concurrency || 3;
    this.queue = [];
    this.running = 0;
    this.completed = 0;
    this.failed = 0;
    this.results = [];
    this.limiter = pLimit(this.concurrency);
  }

  async execute(tasks, executor) {
    const startTime = Date.now();
    logger.info('Starting parallel execution', {
      totalTasks: tasks.length,
      concurrency: this.concurrency
    });

    this.emit('start', { totalTasks: tasks.length });

    const promises = tasks.map((task, index) =>
      this.limiter(async () => {
        this.running++;
        this.emit('taskStart', { task, index });

        try {
          const result = await executor(task, index);

          this.completed++;
          this.running--;
          this.results.push({ task, index, success: true, result });

          this.emit('taskComplete', {
            task,
            index,
            result,
            progress: {
              completed: this.completed,
              failed: this.failed,
              total: tasks.length
            }
          });

          return { success: true, result, task, index };
        } catch (err) {
          this.failed++;
          this.running--;
          this.results.push({ task, index, success: false, error: err });

          this.emit('taskFailed', {
            task,
            index,
            error: err.message,
            progress: {
              completed: this.completed,
              failed: this.failed,
              total: tasks.length
            }
          });

          return { success: false, error: err, task, index };
        }
      })
    );

    const results = await Promise.all(promises);
    const duration = Date.now() - startTime;

    this.emit('complete', {
      total: tasks.length,
      completed: this.completed,
      failed: this.failed,
      duration
    });

    logger.success('Parallel execution completed', {
      total: tasks.length,
      completed: this.completed,
      failed: this.failed,
      duration: `${duration}ms`
    });

    return results;
  }

  getProgress() {
    return {
      completed: this.completed,
      failed: this.failed,
      running: this.running,
      total: this.queue.length + this.completed + this.failed
    };
  }

  getResults() {
    return this.results;
  }
}

export default ParallelExecutor;
