import { MemoryJobQueue } from "./memory";

export interface JobQueue {
  enqueue(jobName: string, payload: unknown): void;
  schedule(jobName: string, payload: unknown, delayMs: number): void;
}

export function createJobQueue(): JobQueue {
  return new MemoryJobQueue();
}

export { MemoryJobQueue } from "./memory";
