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
 * @property path - Full path including parent folders (e.g., "folder1/subfolder/snapshot.json")
 * @property parentId - ID of parent folder (null for root items)
 */
export interface SnapshotInfo {
  name: string
  filename: string
  createdAt: string
  size: number
  path?: string
  parentId?: string | null
}

/**
 * Represents a folder that can contain snapshots and other folders
 *
 * @property id - Unique folder identifier
 * @property name - Display name of the folder
 * @property path - Full path including parent folders
 * @property parentId - ID of parent folder (null for root folders)
 * @property createdAt - Timestamp when the folder was created
 */
export interface SnapshotFolder {
  id: string
  name: string
  path: string
  parentId: string | null
  createdAt: string
}

/**
 * Union type for any item in the snapshot tree (file or folder)
 *
 * @property type - Discriminator to identify if item is a file or folder
 */
export type SnapshotItem =
  | (SnapshotInfo & { type: 'file' })
  | (SnapshotFolder & { type: 'folder' })

/**
 * Tree node for displaying folder structure
 *
 * @property key - Unique key for the node (used by Ant Design Tree)
 * @property title - Display title
 * @property children - Child nodes
 * @property isLeaf - Whether this is a leaf node (file)
 * @property item - The original SnapshotItem data
 */
export interface SnapshotTreeNode {
  key: string
  title: string
  children?: SnapshotTreeNode[]
  isLeaf?: boolean
  item: SnapshotItem
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
