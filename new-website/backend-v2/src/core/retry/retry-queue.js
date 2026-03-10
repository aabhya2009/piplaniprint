import { nextDelayMs } from './retry-policy.js';

export class RetryQueue {
  constructor() {
    this.jobs = [];
  }

  enqueue(job) {
    const item = {
      id: job.id,
      type: job.type,
      payload: job.payload,
      attempts: job.attempts || 0,
      maxAttempts: job.maxAttempts || 5,
      runAt: Date.now()
    };
    this.jobs.push(item);
    return item;
  }

  requeue(job, errorMessage = 'retry_scheduled') {
    const attempts = job.attempts + 1;
    const delayed = {
      ...job,
      attempts,
      runAt: Date.now() + nextDelayMs(attempts - 1),
      errorMessage
    };
    this.jobs.push(delayed);
    return delayed;
  }

  dueJobs(now = Date.now()) {
    return this.jobs.filter((j) => j.runAt <= now);
  }
}
