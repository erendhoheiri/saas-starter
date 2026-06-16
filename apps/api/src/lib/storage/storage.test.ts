import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LocalStorageProvider } from "./local";
import { createStorageProvider } from "./index";

describe("LocalStorageProvider", () => {
  let tmpDir: string;
  let provider: LocalStorageProvider;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "storage-test-"));
    provider = new LocalStorageProvider(tmpDir);
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("uploads and downloads a file", async () => {
    const content = Buffer.from("hello world");
    await provider.upload("test/file.txt", content, "text/plain");

    const downloaded = await provider.download("test/file.txt");
    expect(downloaded).toEqual(content);
  });

  it("returns a local URL for a key", () => {
    const url = provider.getUrl("some/file.png");
    expect(url).toContain("some/file.png");
  });

  it("deletes a file", async () => {
    const content = Buffer.from("to be deleted");
    await provider.upload("del/file.txt", content, "text/plain");
    await provider.delete("del/file.txt");

    await expect(provider.download("del/file.txt")).rejects.toThrow();
  });

  it("throws when downloading a non-existent file", async () => {
    await expect(provider.download("nonexistent/file.txt")).rejects.toThrow();
  });
});

describe("createStorageProvider", () => {
  it("returns LocalStorageProvider when STORAGE_PROVIDER=local", () => {
    const provider = createStorageProvider({ STORAGE_PROVIDER: "local" });
    expect(provider).toBeInstanceOf(LocalStorageProvider);
  });

  it("returns an S3StorageProvider instance when STORAGE_PROVIDER=s3", () => {
    const provider = createStorageProvider({ STORAGE_PROVIDER: "s3" });
    expect(typeof provider.upload).toBe("function");
    expect(typeof provider.download).toBe("function");
    expect(typeof provider.delete).toBe("function");
    expect(typeof provider.getUrl).toBe("function");
  });

  it("S3StorageProvider throws when methods are called without S3 env vars", async () => {
    const provider = createStorageProvider({
      STORAGE_PROVIDER: "s3",
      S3_BUCKET: undefined,
      S3_REGION: undefined,
    });

    await expect(
      provider.upload("key", Buffer.from("data"), "text/plain"),
    ).rejects.toThrow("S3 not configured");

    await expect(provider.download("key")).rejects.toThrow("S3 not configured");
    await expect(provider.delete("key")).rejects.toThrow("S3 not configured");
    expect(() => provider.getUrl("key")).toThrow("S3 not configured");
  });
});
