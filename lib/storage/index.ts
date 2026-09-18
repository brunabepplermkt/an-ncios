import type { CreativeStorageAdapter } from "./creative-storage-adapter";
import { LocalFileSystemStorageAdapter } from "./local-adapter";

/**
 * Single seam for the whole app: everything that touches creative files
 * goes through this factory. Today it always returns the local adapter.
 * Tomorrow, wire STORAGE_DRIVER=supabase|s3 here and return the matching
 * adapter — no caller changes.
 */
export function getCreativeStorageAdapter(): CreativeStorageAdapter {
  return new LocalFileSystemStorageAdapter();
}

export type { CreativeStorageAdapter, StoredFile } from "./creative-storage-adapter";
