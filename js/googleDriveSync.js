/**
 * googleDriveSync.js
 * Automatic synchronization and upload of child health documents to Google Drive.
 * Organizes files into: "Child Health Documents — [NGO Name]" / "[Child Name]" / "[File]"
 */

import { apiFetch } from './apiClient.js';
import { getUploadedDocs, updateUploadedDoc } from './storage.js';
import { toast } from './toast.js';

let isAutoSyncing = false;

/**
 * Convert a base64 Data URL into a binary Blob object.
 * @param {string} dataurl
 * @returns {Blob|null}
 */
export function dataURLtoBlob(dataurl) {
  if (!dataurl || typeof dataurl !== 'string' || !dataurl.startsWith('data:')) {
    return null;
  }
  try {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch (err) {
    console.warn('[Drive Sync] dataURLtoBlob conversion error:', err);
    return null;
  }
}

/**
 * Upload a file or blob directly to the backend Google Drive upload endpoint.
 * @param {File|Blob} fileOrBlob
 * @param {object} metadata
 * @param {string} [metadata.childName]
 * @param {string} [metadata.childId]
 * @param {string} [metadata.docName]
 * @param {string} [metadata.docType]
 * @returns {Promise<object>}
 */
export async function uploadDocumentToDrive(fileOrBlob, metadata = {}) {
  const {
    childName = 'General Documents',
    childId = null,
    docName = 'Medical Document',
    docType = 'Medical Report'
  } = metadata;

  const formData = new FormData();
  const fileName = docName || fileOrBlob.name || 'document';

  formData.append('document', fileOrBlob, fileName);
  formData.append('childName', childName);
  if (childId) formData.append('childId', childId);
  formData.append('docName', fileName);
  formData.append('docType', docType);

  try {
    const res = await apiFetch('/api/drive/upload', {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `Upload failed with status ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.warn('[Google Drive] Upload failed:', err.message);
    throw err;
  }
}

const activeSyncDocIds = new Set();

/**
 * Synchronize a single stored document record to Google Drive.
 * @param {object} doc
 * @returns {Promise<object>}
 */
export async function syncSingleDocToDrive(doc) {
  if (!doc) throw new Error('Document record is required');
  if (doc.driveUrl) {
    return { success: true, alreadySynced: true, driveUrl: doc.driveUrl };
  }
  if (activeSyncDocIds.has(doc.id)) {
    return { success: true, inProgress: true };
  }

  activeSyncDocIds.add(doc.id);
  try {
    const dataUrl = doc.fileData || doc.image;
    if (!dataUrl) {
      throw new Error('No local document file data to upload');
    }

    const blob = dataURLtoBlob(dataUrl);
    if (!blob) {
      throw new Error('Could not convert document data to binary buffer');
    }

    const docName = doc.name || doc.title || 'Medical Document';
    const childName = doc.child || doc.childName || doc.student || 'General Documents';
    const docType = doc.docType || doc.category || 'Medical Report';

    const res = await uploadDocumentToDrive(blob, {
      childName,
      childId: doc.childId,
      docName,
      docType
    });

    if (res && res.success && res.driveUrl) {
      updateUploadedDoc(doc.id, {
        driveFileId: res.driveFileId,
        driveUrl: res.driveUrl,
        childFolderId: res.childFolderId,
        childFolderUrl: res.childFolderUrl
      });
      return { success: true, driveUrl: res.driveUrl, driveFileId: res.driveFileId };
    }

    throw new Error(res?.message || 'Failed to sync document to Google Drive');
  } finally {
    activeSyncDocIds.delete(doc.id);
  }
}

/**
 * Automatically scan stored documents and upload any unsynced documents to Google Drive.
 * @param {boolean} [showToasts=false]
 * @returns {Promise<{total: number, synced: number, failed: number}>}
 */
export async function autoSyncPendingDocuments(showToasts = false) {
  if (isAutoSyncing) return { inProgress: true };

  const docs = getUploadedDocs();
  const unsynced = docs.filter(d => !d.driveUrl && (d.fileData || d.image) && !activeSyncDocIds.has(d.id));
  if (unsynced.length === 0) {
    return { total: 0, synced: 0, failed: 0 };
  }

  isAutoSyncing = true;
  let synced = 0;
  let failed = 0;

  if (showToasts) {
    toast('Google Drive Auto-Sync', `Syncing ${unsynced.length} pending document(s) to Drive...`, 'info');
  }

  for (const doc of unsynced) {
    // Check again before calling to ensure it wasn't synced concurrently
    const current = getUploadedDocs().find(d => d.id === doc.id);
    if (current?.driveUrl) continue;

    try {
      await syncSingleDocToDrive(doc);
      synced++;
    } catch (err) {
      console.warn(`[Auto-Sync] Could not sync doc ${doc.id} (${doc.name}):`, err.message);
      failed++;
    }
  }

  isAutoSyncing = false;

  if (synced > 0) {
    if (showToasts) {
      toast('Google Drive Synced', `Successfully backed up ${synced} document(s) to Google Drive.`, 'success');
    }
    window.dispatchEvent(new CustomEvent('chm-docs-synced', { detail: { synced, failed } }));
  }

  return { total: unsynced.length, synced, failed };
}
