import { randomUUID } from "node:crypto";
import { mkdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { CreativeStorageAdapter, StoredFile } from "./creative-storage-adapter";

const UPLOAD_DIR = path.join(process.cwd(), "storage", "uploads");

function extensionFromFileName(fileName: string): string {
  const ext = path.extname(fileName);
  return ext || "";
}

/**
 * Dev-appropriate storage: saves creative files to storage/uploads on the
 * local filesystem and serves them through /api/files/[key]. Fine for a
 * single-user local tool; not meant to survive a redeploy of a hosted
 * environment. Swap for SupabaseStorageAdapter / S3StorageAdapter later
 * without touching any caller — they only depend on CreativeStorageAdapter.
 */
export class LocalFileSystemStorageAdapter implements CreativeStorageAdapter {
  readonly kind = "local-fs";

  async save(file: { buffer: Buffer; fileName: string; mimeType: string }): Promise<StoredFile> {
    await mkdir(UPLOAD_DIR, { recursive: true });
    const key = `${randomUUID()}${extensionFromFileName(file.fileName)}`;
    const fullPath = path.join(UPLOAD_DIR, key);
    await writeFile(fullPath, file.buffer);
    const stats = await stat(fullPath);
    return { key, url: this.getUrl(key), sizeBytes: stats.size };
  }

  getUrl(key: string): string {
    return `/api/files/${encodeURIComponent(key)}`;
  }

  async delete(key: string): Promise<void> {
    const fullPath = path.join(UPLOAD_DIR, key);
    await unlink(fullPath).catch(() => undefined);
  }
}

export function resolveUploadPath(key: string): string {
  return path.join(UPLOAD_DIR, key);
}
