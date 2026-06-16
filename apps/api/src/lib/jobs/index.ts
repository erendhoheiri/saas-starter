import { MemoryJobQueue } from "./memory";

export interface JobQueue {
  enqueue(jobName: string, payload: unknown): void;
  schedule(jobName: string, payload: unknown, delayMs: number): void;
}

export function createJobQueue(): JobQueue {
  return new MemoryJobQueue();
}

/**
 * Application-wide singleton job queue.
 * Import this instead of calling createJobQueue() so all callers share the
 * same instance and registered handlers are visible to scheduled jobs.
 */
export const jobQueue: JobQueue = createJobQueue();

export { MemoryJobQueue } from "./memory";
