import { describe, expect, it } from "bun:test";
import { MemoryJobQueue } from "./memory";

type TestPayload = { value: string };

describe("MemoryJobQueue", () => {
  it("runs an enqueued job synchronously", () => {
    const queue = new MemoryJobQueue();
    const results: string[] = [];

    queue.registerHandler<TestPayload>("test-job", (payload) => {
      results.push(payload.value);
    });

    queue.enqueue("test-job", { value: "hello" });

    expect(results).toEqual(["hello"]);
  });

  it("runs multiple enqueued jobs in order", () => {
    const queue = new MemoryJobQueue();
    const results: string[] = [];

    queue.registerHandler<TestPayload>("ordered-job", (payload) => {
      results.push(payload.value);
    });

    queue.enqueue("ordered-job", { value: "first" });
    queue.enqueue("ordered-job", { value: "second" });
    queue.enqueue("ordered-job", { value: "third" });

    expect(results).toEqual(["first", "second", "third"]);
  });

  it("schedules a delayed job via setTimeout", async () => {
    const queue = new MemoryJobQueue();
    const results: string[] = [];

    queue.registerHandler<TestPayload>("delayed-job", (payload) => {
      results.push(payload.value);
    });

    queue.schedule("delayed-job", { value: "delayed" }, 50);

    // Not yet run (it's async)
    expect(results).toEqual([]);

    // Wait for the delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(results).toEqual(["delayed"]);
  });

  it("does not throw for unknown job names (fire-and-forget)", () => {
    const queue = new MemoryJobQueue();
    expect(() => queue.enqueue("unknown-job", { value: "x" })).not.toThrow();
  });

  it("does not throw scheduling unknown job names", async () => {
    const queue = new MemoryJobQueue();
    expect(() =>
      queue.schedule("unknown-delayed", { value: "x" }, 10),
    ).not.toThrow();
    // Wait so the setTimeout fires without unhandled rejection
    await new Promise((resolve) => setTimeout(resolve, 30));
  });

  it("supports a hard-delete scheduled scenario", async () => {
    const queue = new MemoryJobQueue();
    let deletedId: string | null = null;

    queue.registerHandler<{ userId: string }>("hard-delete-user", (payload) => {
      deletedId = payload.userId;
    });

    queue.schedule("hard-delete-user", { userId: "user-123" }, 50);

    expect(deletedId).toBeNull();

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(deletedId).toBe("user-123");
  });
});
