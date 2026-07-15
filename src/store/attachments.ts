/**
 * store/attachments.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Attachments store for Phase A6.8.
 * Supports: upload, download, preview, delete.
 * Keyed by entityType+entityId.
 */

import { Store } from './base';
import { platformClient } from '../api/request';
import { request } from '../api/request';
import { Endpoints } from '../api/endpoints';
import { responseCache, CacheKeys } from '../api/cache';
import { deduplicator } from '../api/deduplicator';
import { optimisticUpdate, optimisticRemove } from '../api/optimistic';
import type {
  Attachment,
  AttachmentEntityType,
  UploadAttachmentRequest,
} from '../types/shared';

// ─── State ────────────────────────────────────────────────────────────────────

export interface AttachmentsState {
  byEntity: Record<string, Attachment[]>;
  uploading: Record<string, boolean>;
  loading: Record<string, boolean>;
  error: Record<string, string | null>;
  /** Preview blob URLs keyed by attachmentId */
  previewUrls: Record<string, string>;
}

const initialState: AttachmentsState = {
  byEntity: {},
  uploading: {},
  loading: {},
  error: {},
  previewUrls: {},
};

// ─── Store ────────────────────────────────────────────────────────────────────

export class AttachmentsStore extends Store<AttachmentsState> {
  constructor() {
    super(initialState);
  }

  private entityKey(entityType: string, entityId: string): string {
    return `${entityType}:${entityId}`;
  }

  getAttachments(entityType: string, entityId: string): Attachment[] {
    return this.getState().byEntity[this.entityKey(entityType, entityId)] ?? [];
  }

  isLoading(entityType: string, entityId: string): boolean {
    return this.getState().loading[this.entityKey(entityType, entityId)] ?? false;
  }

  isUploading(entityType: string, entityId: string): boolean {
    return this.getState().uploading[this.entityKey(entityType, entityId)] ?? false;
  }

  getError(entityType: string, entityId: string): string | null {
    return this.getState().error[this.entityKey(entityType, entityId)] ?? null;
  }

  // ─── Async: Load ────────────────────────────────────────────────────────────

  async loadAttachments(
    entityType: AttachmentEntityType,
    entityId: string,
    forceRefresh = false,
  ): Promise<void> {
    const key = this.entityKey(entityType, entityId);
    const cacheKey = CacheKeys.attachments(entityType, entityId);
    const TTL_ATTACH = 60_000;

    if (!forceRefresh) {
      const cached = responseCache.get<{ attachments: Attachment[] }>(cacheKey);
      if (cached) {
        this.setState((s) => ({
          byEntity: { ...s.byEntity, [key]: cached.attachments ?? [] },
        }));
        return;
      }
    }

    this.setState((s) => ({
      loading: { ...s.loading, [key]: true },
      error: { ...s.error, [key]: null },
    }));

    try {
      const res = await deduplicator.get(cacheKey, () =>
        request.get<{ attachments: Attachment[] }>(
          Endpoints.attachments.list(entityType, entityId),
        ),
      );
      responseCache.set(cacheKey, res, TTL_ATTACH);
      this.setState((s) => ({
        byEntity: { ...s.byEntity, [key]: res.attachments ?? [] },
      }));
    } catch (err: unknown) {
      this.setState((s) => ({
        error: { ...s.error, [key]: err instanceof Error ? err.message : 'Failed to load attachments' },
      }));
    } finally {
      this.setState((s) => ({ loading: { ...s.loading, [key]: false } }));
    }
  }

  // ─── Async: Upload ───────────────────────────────────────────────────────────

  async uploadAttachment({ entityType, entityId, file }: UploadAttachmentRequest): Promise<Attachment> {
    const key = this.entityKey(entityType, entityId);

    this.setState((s) => ({
      uploading: { ...s.uploading, [key]: true },
      error: { ...s.error, [key]: null },
    }));

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entityType', entityType);
      formData.append('entityId', entityId);

      const res = await platformClient.upload<{ attachment: Attachment }>(
        Endpoints.attachments.upload(),
        formData,
      );

      this.setState((s) => ({
        byEntity: {
          ...s.byEntity,
          [key]: [...(s.byEntity[key] ?? []), res.attachment],
        },
      }));

      responseCache.invalidate(CacheKeys.attachments(entityType, entityId));
      return res.attachment;
    } catch (err: unknown) {
      this.setState((s) => ({
        error: { ...s.error, [key]: err instanceof Error ? err.message : 'Upload failed' },
      }));
      throw err;
    } finally {
      this.setState((s) => ({ uploading: { ...s.uploading, [key]: false } }));
    }
  }

  // ─── Async: Download ─────────────────────────────────────────────────────────

  async downloadAttachment(attachmentId: string, filename: string): Promise<void> {
    try {
      const blob = await platformClient.download(
        Endpoints.attachments.download(attachmentId),
      );
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err: unknown) {
      throw err;
    }
  }

  // ─── Preview URL ────────────────────────────────────────────────────────────

  async getPreviewUrl(attachmentId: string): Promise<string> {
    const existing = this.getState().previewUrls[attachmentId];
    if (existing) return existing;

    const blob = await platformClient.download(
      Endpoints.attachments.download(attachmentId),
    );
    const url = URL.createObjectURL(blob);
    this.setState((s) => ({
      previewUrls: { ...s.previewUrls, [attachmentId]: url },
    }));
    return url;
  }

  // ─── Async: Delete (optimistic) ─────────────────────────────────────────────

  async deleteAttachment(
    attachmentId: string,
    entityType: AttachmentEntityType,
    entityId: string,
  ): Promise<void> {
    const key = this.entityKey(entityType, entityId);
    const prev = [...(this.getState().byEntity[key] ?? [])];

    // Revoke preview URL if exists
    const previewUrl = this.getState().previewUrls[attachmentId];
    if (previewUrl) URL.revokeObjectURL(previewUrl);

    await optimisticUpdate({
      apply: () => {
        this.setState((s) => ({
          byEntity: {
            ...s.byEntity,
            [key]: optimisticRemove(s.byEntity[key] ?? [], attachmentId),
          },
          previewUrls: Object.fromEntries(
            Object.entries(s.previewUrls).filter(([k]) => k !== attachmentId),
          ),
        }));
      },
      rollback: () => {
        this.setState((s) => ({ byEntity: { ...s.byEntity, [key]: prev } }));
      },
      commit: () => request.delete<void>(Endpoints.attachments.delete(attachmentId)),
    });

    responseCache.invalidate(CacheKeys.attachments(entityType, entityId));
  }

  reset(): void {
    // Revoke all preview URLs
    for (const url of Object.values(this.getState().previewUrls)) {
      URL.revokeObjectURL(url as string);
    }
    this.setState(initialState);
  }
}

export const attachmentsStore = new AttachmentsStore();
