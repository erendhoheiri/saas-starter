import type { StorageProvider } from "./index";

interface S3Config {
  bucket?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  endpoint?: string;
}

export class S3StorageProvider implements StorageProvider {
  private config: S3Config;

  constructor(config: S3Config) {
    this.config = config;
  }

  private assertConfigured(): void {
    if (!this.config.bucket || !this.config.region) {
      throw new Error(
        "S3 not configured: S3_BUCKET and S3_REGION are required",
      );
    }
  }

  async upload(
    _key: string,
    _buffer: Buffer,
    _contentType: string,
  ): Promise<void> {
    this.assertConfigured();
    // TODO: implement with @aws-sdk/client-s3
    throw new Error("S3 not configured: S3_BUCKET and S3_REGION are required");
  }

  async download(_key: string): Promise<Buffer> {
    this.assertConfigured();
    // TODO: implement with @aws-sdk/client-s3
    throw new Error("S3 not configured: S3_BUCKET and S3_REGION are required");
  }

  async delete(_key: string): Promise<void> {
    this.assertConfigured();
    // TODO: implement with @aws-sdk/client-s3
    throw new Error("S3 not configured: S3_BUCKET and S3_REGION are required");
  }

  getUrl(_key: string): string {
    this.assertConfigured();
    // TODO: implement with @aws-sdk/client-s3
    throw new Error("S3 not configured: S3_BUCKET and S3_REGION are required");
  }
}
