/**
 * Snapshot API Service
 *
 * This module provides functions to interact with the snapshot backend server.
 * All functions handle HTTP communication and error handling for snapshot operations.
 *
 * Configuration via environment variables:
 * - VITE_SERVER_URL: The full server URL (default: http://localhost:3002)
 */

import type { TLEditorSnapshot } from 'tldraw'
import type {
    SnapshotInfo,
    SnapshotsListResponse,
    SaveSnapshotResponse,
    LoadSnapshotResponse,
    DeleteSnapshotResponse,
} from '../types'

/**
 * Server URL from environment variable
 * Falls back to default if not configured
 */
const API_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3002'

/**
 * Fetches the list of all saved snapshots from the server
 * 
 * @returns Promise resolving to an array of snapshot metadata
 * @throws Error if the network request fails
 * 
 * @example
 * ```ts
 * const snapshots = await fetchSnapshots()
 * console.log(snapshots) // [{ name: 'my-drawing', filename: 'my-drawing.json', ... }]
 * ```
 */
export async function fetchSnapshots(): Promise<SnapshotInfo[]> {
    const response = await fetch(`${API_URL}/api/snapshots`)
    const data: SnapshotsListResponse = await response.json()

    if (data.success && data.snapshots) {
        return data.snapshots
    }

    throw new Error(data.error || 'Failed to fetch snapshots')
}

/**
 * Saves a new snapshot to the server
 * 
 * @param name - The display name for the snapshot (will be sanitized for filename)
 * @param data - The snapshot data containing document and session state
 * @returns Promise resolving to the saved snapshot filename
 * @throws Error if the save operation fails
 * 
 * @example
 * ```ts
 * const filename = await saveSnapshot('my-drawing', { document, session })
 * console.log(`Saved as: ${filename}`)
 * ```
 */
export async function saveSnapshot(
    name: string,
    data: { document: unknown; session: unknown }
): Promise<string> {
    const response = await fetch(`${API_URL}/api/snapshots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, data }),
    })

    const result: SaveSnapshotResponse = await response.json()

    if (result.success && result.filename) {
        return result.filename
    }

    throw new Error(result.error || 'Failed to save snapshot')
}

/**
 * Loads a snapshot from the server by filename
 * 
 * @param filename - The filename of the snapshot to load
 * @returns Promise resolving to the snapshot data
 * @throws Error if the load operation fails
 * 
 * @example
 * ```ts
 * const snapshotData = await loadSnapshot('my-drawing.json')
 * loadSnapshot(editor.store, snapshotData)
 * ```
 */
export async function loadSnapshotFromServer(
    filename: string
): Promise<{ document: unknown; session: unknown }> {
    const response = await fetch(`${API_URL}/api/snapshots/${filename}`)
    const data: LoadSnapshotResponse = await response.json()

    if (data.success && data.data) {
        return data.data
    }

    throw new Error(data.error || 'Failed to load snapshot')
}

/**
 * Deletes a snapshot from the server by filename
 * 
 * @param filename - The filename of the snapshot to delete
 * @returns Promise resolving when deletion is complete
 * @throws Error if the delete operation fails
 * 
 * @example
 * ```ts
 * await deleteSnapshot('old-drawing.json')
 * console.log('Snapshot deleted')
 * ```
 */
export async function deleteSnapshot(filename: string): Promise<void> {
    const response = await fetch(`${API_URL}/api/snapshots/${filename}`, {
        method: 'DELETE',
    })

    const data: DeleteSnapshotResponse = await response.json()

    if (!data.success) {
        throw new Error(data.error || 'Failed to delete snapshot')
    }
}
