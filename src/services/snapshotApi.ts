/**
 * Snapshot API Service
 *
 * This module provides functions to interact with the snapshot backend server.
 * All functions handle HTTP communication and error handling for snapshot operations.
 * 
 * Features:
 * - Automatic chunking for large snapshots
 * - Progress reporting for uploads
 * - Full CRUD operations
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
import { uploadInChunks, updateInChunks, shouldUseChunking } from '../utils/chunkedUpload'

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
 * Uses chunked upload for large snapshots
 * 
 * @param name - The display name for the snapshot (will be sanitized for filename)
 * @param data - The snapshot data containing document and session state
 * @param onProgress - Optional progress callback for chunked uploads
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
    data: { document: unknown; session: unknown },
    onProgress?: (progress: number) => void
): Promise<string> {
    // Use chunked upload for large data
    if (shouldUseChunking(data)) {
        const filename = `${name}.json`
        await uploadInChunks(API_URL, filename, data, onProgress)
        return filename
    }

    // Regular upload for small data
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
 * const snapshotData = await loadSnapshotFromServer('my-drawing.json')
 * loadSnapshot(editor.store, snapshotData)
 * ```
 */
export async function loadSnapshotFromServer(
    filename: string
): Promise<TLEditorSnapshot> {
    const response = await fetch(`${API_URL}/api/snapshots/${filename}`)
    const data: LoadSnapshotResponse = await response.json()

    if (data.success && data.data) {
        return data.data
    }

    throw new Error(data.error || 'Failed to load snapshot')
}

/**
 * Updates an existing snapshot on the server
 * Uses chunked upload for large snapshots
 * 
 * @param filename - The filename of the snapshot to update
 * @param data - The snapshot data containing document and session state
 * @param onProgress - Optional progress callback for chunked uploads
 * @returns Promise resolving when update is complete
 * @throws Error if the update operation fails
 * 
 * @example
 * ```ts
 * await updateSnapshot('my-drawing.json', { document, session })
 * console.log('Snapshot updated')
 * ```
 */
export async function updateSnapshot(
    filename: string,
    data: { document: unknown; session: unknown },
    onProgress?: (progress: number) => void
): Promise<void> {
    // Use chunked upload for large data
    if (shouldUseChunking(data)) {
        await updateInChunks(API_URL, filename, data, onProgress)
        return
    }

    // Regular update for small data
    const response = await fetch(`${API_URL}/api/snapshots/${filename}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
    })

    const result: SaveSnapshotResponse = await response.json()

    if (!result.success) {
        throw new Error(result.error || 'Failed to update snapshot')
    }
}

/**
 * Renames a snapshot on the server
 * 
 * @param oldFilename - The current filename of the snapshot
 * @param newName - The new name for the snapshot
 * @returns Promise resolving to the new filename
 * @throws Error if the rename operation fails
 * 
 * @example
 * ```ts
 * await renameSnapshot('old-name.json', 'new-name')
 * console.log('Snapshot renamed')
 * ```
 */
export async function renameSnapshot(
    oldFilename: string,
    newName: string
): Promise<string> {
    const response = await fetch(`${API_URL}/api/snapshots/${oldFilename}/rename`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newName }),
    })

    const result: SaveSnapshotResponse = await response.json()

    if (result.success && result.filename) {
        return result.filename
    }

    throw new Error(result.error || 'Failed to rename snapshot')
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

/**
 * Imports multiple snapshots from JSON files
 * Server automatically renames if duplicate names exist
 *
 * @param files - Array of JSON files to import
 * @param onProgress - Optional progress callback
 * @returns Promise resolving to array of imported snapshot names
 *
 * @example
 * ```ts
 * const imported = await importSnapshots(fileList)
 * console.log(`Imported: ${imported.join(', ')}`)
 * ```
 */
export async function importSnapshots(
    files: File[],
    onProgress?: (current: number, total: number) => void
): Promise<string[]> {
    const importedNames: string[] = []
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i]
        
        try {
            const text = await file.text()
            const snapshotData = JSON.parse(text)
            
            // Extract name from filename (remove .json extension)
            const name = file.name.replace(/\.json$/i, '')
            
            // Use import endpoint which handles duplicates
            const response = await fetch(`${API_URL}/api/snapshots/import`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, data: snapshotData }),
            })
            
            const result = await response.json()
            
            if (result.success) {
                importedNames.push(result.name)
            }
        } catch (error) {
            console.error(`Failed to import ${file.name}:`, error)
        }
        
        if (onProgress) {
            onProgress(i + 1, files.length)
        }
    }
    
    return importedNames
}

/**
 * Exports selected snapshots as a single JSON file download
 *
 * @param filenames - Array of filenames to export
 * @returns Promise resolving when download starts
 *
 * @example
 * ```ts
 * await exportSnapshots(['drawing1.json', 'drawing2.json'])
 * ```
 */
export async function exportSnapshots(filenames: string[]): Promise<void> {
    const response = await fetch(`${API_URL}/api/snapshots/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filenames }),
    })
    
    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to export snapshots')
    }
    
    // Get the blob from response
    const blob = await response.blob()
    
    // Create download link
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `snapshots-export-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

/**
 * Exports a single snapshot as JSON file download
 *
 * @param filename - The filename to export
 */
export async function exportSingleSnapshot(filename: string): Promise<void> {
    const response = await fetch(`${API_URL}/api/snapshots/${filename}`)
    
    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to export snapshot')
    }
    
    const data = await response.json()
    const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' })
    
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}
