/**
 * hooks/useAttachments.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Hook for Attachments on any entity.
 * Supports upload, download, preview, delete.
 * Requests cancelled on unmount.
 */

import { useEffect, useCallback, useRef } from 'react';
import { attachmentsStore } from '../store/attachments';
import type { AttachmentEntityType } from '../types/shared';

export function useAttachments(entityType: AttachmentEntityType, entityId: string) {
  const state = attachmentsStore.useStore();
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!entityType || !entityId) return;
    abortRef.current = new AbortController();
    attachmentsStore.loadAttachments(entityType, entityId);

    return () => {
      abortRef.current?.abort();
    };
  }, [entityType, entityId]);

  const refresh = useCallback(
    () => attachmentsStore.loadAttachments(entityType, entityId, true),
    [entityType, entityId],
  );

  const upload = useCallback(
    (file: File) => attachmentsStore.uploadAttachment({ entityType, entityId, file }),
    [entityType, entityId],
  );

  const download = useCallback(
    (attachmentId: string, filename: string) =>
      attachmentsStore.downloadAttachment(attachmentId, filename),
    [],
  );

  const getPreviewUrl = useCallback(
    (attachmentId: string) => attachmentsStore.getPreviewUrl(attachmentId),
    [],
  );

  const deleteAttachment = useCallback(
    (attachmentId: string) =>
      attachmentsStore.deleteAttachment(attachmentId, entityType, entityId),
    [entityType, entityId],
  );

  return {
    attachments: attachmentsStore.getAttachments(entityType, entityId),
    loading: attachmentsStore.isLoading(entityType, entityId),
    uploading: attachmentsStore.isUploading(entityType, entityId),
    error: attachmentsStore.getError(entityType, entityId),
    previewUrls: state.previewUrls,
    refresh,
    upload,
    download,
    getPreviewUrl,
    deleteAttachment,
  };
}
