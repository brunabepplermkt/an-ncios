export interface StoredFile {
  key: string;
  url: string;
  sizeBytes: number;
}

/**
 * Storage abstraction for creative assets (images/videos). Swap the
 * implementation returned by getCreativeStorageAdapter() to move from
 * local disk to Supabase Storage, S3, etc. — nothing above this layer
 * needs to change.
 */
export interface CreativeStorageAdapter {
  readonly kind: string;
  save(file: { buffer: Buffer; fileName: string; mimeType: string }): Promise<StoredFile>;
  getUrl(key: string): string;
  delete(key: string): Promise<void>;
}
