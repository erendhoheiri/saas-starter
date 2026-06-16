import { LocalStorageProvider } from "./local";
import { S3StorageProvider } from "./s3";

export interface StorageProvider {
  upload(key: string, buffer: Buffer, contentType: string): Promise<void>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  getUrl(key: string): string;
}

interface StorageEnv {
  STORAGE_PROVIDER?: string;
  S3_BUCKET?: string;
  S3_REGION?: string;
  S3_ACCESS_KEY_ID?: string;
  S3_SECRET_ACCESS_KEY?: string;
  S3_ENDPOINT?: string;
}

export function createStorageProvider(
  env: StorageEnv = process.env as unknown as StorageEnv,
): StorageProvider {
  if (env.STORAGE_PROVIDER === "s3") {
    return new S3StorageProvider({
      bucket: env.S3_BUCKET,
      region: env.S3_REGION,
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      endpoint: env.S3_ENDPOINT,
    });
  }
  return new LocalStorageProvider();
}

export { LocalStorageProvider } from "./local";
export { S3StorageProvider } from "./s3";
