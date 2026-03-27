/**
 * Type definitions for the tldraw snapshot application
 *
 * This module contains all TypeScript interfaces used throughout the application
 * for type safety and better developer experience.
 */

import type { TLEditorSnapshot } from 'tldraw'

/**
 * Represents metadata about a saved snapshot
 *
 * @property name - Display name of the snapshot
 * @property filename - Actual filename stored on the server (includes .json extension)
 * @property createdAt - Timestamp when the snapshot was created
 * @property size - File size in bytes
 */
export interface SnapshotInfo {
  name: string
  filename: string
  createdAt: string
  size: number
}

/**
 * Props for the SaveModal component
 * 
 * @property isOpen - Controls the visibility of the modal
 * @property onClose - Callback fired when the modal is closed
 * @property onSave - Callback fired when user confirms save, receives the snapshot name
 */
export interface SaveModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (name: string) => void
}

/**
 * Props for the LoadModal component
 * 
 * @property isOpen - Controls the visibility of the modal
 * @property onClose - Callback fired when the modal is closed
 * @property snapshots - Array of available snapshots to display
 * @property onLoad - Callback fired when user selects a snapshot to load
 * @property onDelete - Callback fired when user requests to delete a snapshot
 * @property loading - Shows loading state while fetching snapshots
 */
export interface LoadModalProps {
  isOpen: boolean
  onClose: () => void
  snapshots: SnapshotInfo[]
  onLoad: (filename: string) => void
  onDelete: (filename: string) => void
  loading: boolean
}

/**
 * Represents a notification state for user feedback
 * 
 * @property message - The notification message to display
 * @property type - Visual style of the notification (success or error)
 */
export interface NotificationState {
  message: string
  type: 'success' | 'error'
}

/**
 * API response for fetching snapshots list
 * 
 * @property success - Whether the request was successful
 * @property snapshots - Array of snapshot metadata (only on success)
 * @property error - Error message (only on failure)
 */
export interface SnapshotsListResponse {
  success: boolean
  snapshots?: SnapshotInfo[]
  error?: string
}

/**
 * API response for saving a snapshot
 * 
 * @property success - Whether the request was successful
 * @property filename - The filename of the saved snapshot
 * @property name - The sanitized name of the snapshot
 * @property error - Error message (only on failure)
 */
export interface SaveSnapshotResponse {
  success: boolean
  filename?: string
  name?: string
  error?: string
}

/**
 * API response for loading a snapshot
 *
 * @property success - Whether the request was successful
 * @property data - The snapshot data containing document and session
 * @property error - Error message (only on failure)
 */
export interface LoadSnapshotResponse {
  success: boolean
  data?: TLEditorSnapshot
  error?: string
}

/**
 * API response for deleting a snapshot
 * 
 * @property success - Whether the request was successful
 * @property error - Error message (only on failure)
 */
export interface DeleteSnapshotResponse {
  success: boolean
  error?: string
}
