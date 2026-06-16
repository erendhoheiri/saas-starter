import { logger } from "../logger";
import type { JobQueue } from "./index";

type JobHandler<T = unknown> = (payload: T) => void | Promise<void>;

export class MemoryJobQueue implements JobQueue {
  private handlers = new Map<string, JobHandler>();

  registerHandler<T = unknown>(jobName: string, handler: JobHandler<T>): void {
    this.handlers.set(jobName, handler as JobHandler);
  }

  enqueue(jobName: string, payload: unknown): void {
    const handler = this.handlers.get(jobName);
    if (!handler) {
      logger.warn({ msg: `[jobs] no handler registered for: ${jobName}` });
      return;
    }
    try {
      const result = handler(payload);
      // If handler returns a Promise, swallow errors (fire-and-forget)
      if (result instanceof Promise) {
        result.catch((err) => {
          logger.error({
            msg: `[jobs] job ${jobName} failed`,
            err: err instanceof Error ? err.message : err,
          });
        });
      }
    } catch (err) {
      logger.error({
        msg: `[jobs] job ${jobName} threw synchronously`,
        err: err instanceof Error ? err.message : err,
      });
    }
  }

  schedule(jobName: string, payload: unknown, delayMs: number): void {
    // setTimeout only accepts 32-bit signed integer delay (max ~24.8 days).
    // Clamp to the maximum safe value so long-running scheduled jobs (e.g.
    // 30-day hard-delete) don't overflow and fire immediately.
    const MAX_DELAY = 2 ** 31 - 1; // 2_147_483_647 ms ≈ 24.8 days
    const safeDelay = Math.min(delayMs, MAX_DELAY);
    setTimeout(() => {
      this.enqueue(jobName, payload);
    }, safeDelay);
  }
}
