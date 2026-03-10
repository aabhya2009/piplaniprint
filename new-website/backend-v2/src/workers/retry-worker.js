import { RetryQueue } from '../core/retry/retry-queue.js';
import { shouldRetry } from '../core/retry/retry-policy.js';
import { logger } from '../core/observability/logger.js';

export class RetryWorker {
  constructor(handler) {
    this.queue = new RetryQueue();
    this.handler = handler;
  }

  add(job) {
    return this.queue.enqueue(job);
  }

  async tick() {
    const jobs = this.queue.dueJobs();
    this.queue.jobs = this.queue.jobs.filter((j) => !jobs.includes(j));

    for (const job of jobs) {
      try {
        await this.handler(job);
        logger.info('retry_job_success', { jobId: job.id, attempts: job.attempts });
      } catch (error) {
        const statusCode = error?.statusCode || 0;
        if (job.attempts + 1 >= job.maxAttempts || !shouldRetry(statusCode, error?.code)) {
          logger.error('retry_job_dead_letter', { jobId: job.id, attempts: job.attempts + 1, error: error.message });
          continue;
        }
        this.queue.requeue(job, error.message);
        logger.warn('retry_job_rescheduled', { jobId: job.id, attempts: job.attempts + 1 });
      }
    }
  }
}
