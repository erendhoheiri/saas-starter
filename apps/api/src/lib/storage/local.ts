import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { StorageProvider } from "./index";

const DEFAULT_BASE_DIR = join(process.cwd(), ".local-storage");

export class LocalStorageProvider implements StorageProvider {
  private baseDir: string;

  constructor(baseDir: string = DEFAULT_BASE_DIR) {
    this.baseDir = baseDir;
  }

  private resolvePath(key: string): string {
    return join(this.baseDir, key);
  }

  async upload(key: string, buffer: Buffer, _contentType: string): Promise<void> {
    const filePath = this.resolvePath(key);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, buffer);
  }

  async download(key: string): Promise<Buffer> {
    const filePath = this.resolvePath(key);
    return readFile(filePath);
  }

  async delete(key: string): Promise<void> {
    const filePath = this.resolvePath(key);
    await unlink(filePath);
  }

  getUrl(key: string): string {
    return `file://${this.resolvePath(key)}`;
  }
}
