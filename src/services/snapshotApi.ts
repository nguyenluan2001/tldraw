/**
 * Snapshot API Service
 *
 * This module provides functions to interact with the snapshot backend server.
 * All functions handle HTTP communication and error handling for snapshot operations.
 * 
 * Features:
 * - Automatic chunking for large snapshots
 * - Progress reporting for uploads
 * - Full CRUD operations for snapshots and folders
 * - Folder-based organization
 * 
 * Configuration via environment variables:
 * - VITE_SERVER_URL: The full server URL (default: http://localhost:3002)
 */

import type { TLEditorSnapshot } from 'tldraw'
import type {
    SnapshotInfo,
    SnapshotFolder,
    SnapshotItem,
} from '../types'
import { uploadInChunks, updateInChunks, shouldUseChunking } from '../utils/chunkedUpload'

/**
 * Server URL from environment variable
 * Falls back to default if not configured
 */
const API_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3002'

/**
 * Response type for fetching snapshots with folders
 */
interface SnapshotsWithFoldersResponse {
    success: boolean
    snapshots: SnapshotInfo[]
    folders: SnapshotFolder[]
    error?: string
}

/**
 * Fetches the list of all saved snapshots and folders from the server
 * 
 * @returns Promise resolving to an object with snapshots and folders arrays
 * @throws Error if the network request fails
 * 
 * @example
 * ```ts
 * const { snapshots, folders } = await fetchSnapshotsWithFolders()
 * ```
 */
export async function fetchSnapshotsWithFolders(): Promise<{
    snapshots: SnapshotInfo[]
    folders: SnapshotFolder[]
}> {
    const response = await fetch(`${API_URL}/api/snapshots`)
    const data: SnapshotsWithFoldersResponse = await response.json()

    if (data.success) {
        return { 
            snapshots: data.snapshots || [], 
            folders: data.folders || [] 
        }
    }

    throw new Error(data.error || 'Failed to fetch snapshots')
}

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
    const { snapshots } = await fetchSnapshotsWithFolders()
    return snapshots
}

/**
 * Fetches all folders from the server
 * 
 * @returns Promise resolving to an array of folder objects
 * @throws Error if the network request fails
 */
export async function fetchFolders(): Promise<SnapshotFolder[]> {
    const response = await fetch(`${API_URL}/api/folders`)
    const data = await response.json()

    if (data.success) {
        return data.folders || []
    }

    throw new Error(data.error || 'Failed to fetch folders')
}

/**
 * Creates a new folder
 * 
 * @param name - The folder name
 * @param parentId - Optional parent folder ID (null for root)
 * @returns Promise resolving to the created folder
 * @throws Error if the operation fails
 */
export async function createFolder(
    name: string, 
    parentId: string | null = null
): Promise<SnapshotFolder> {
    const response = await fetch(`${API_URL}/api/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, parentId }),
    })

    const data = await response.json()

    if (data.success) {
        return data.folder
    }

    throw new Error(data.error || 'Failed to create folder')
}

/**
 * Renames a folder
 * 
 * @param folderId - The folder ID to rename
 * @param newName - The new name for the folder
 * @returns Promise resolving to the updated folder
 * @throws Error if the operation fails
 */
export async function renameFolder(
    folderId: string, 
    newName: string
): Promise<SnapshotFolder> {
    const response = await fetch(`${API_URL}/api/folders/${folderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
    })

    const data = await response.json()

    if (data.success) {
        return data.folder
    }

    throw new Error(data.error || 'Failed to rename folder')
}

/**
 * Deletes a folder
 * 
 * @param folderId - The folder ID to delete
 * @param deleteContents - Whether to delete files inside the folder
 * @returns Promise that resolves when the folder is deleted
 * @throws Error if the operation fails
 */
export async function deleteFolder(
    folderId: string, 
    deleteContents: boolean = false
): Promise<void> {
    const response = await fetch(
        `${API_URL}/api/folders/${folderId}?deleteContents=${deleteContents}`,
        { method: 'DELETE' }
    )

    const data = await response.json()

    if (!data.success) {
        throw new Error(data.error || 'Failed to delete folder')
    }
}

/**
 * Saves a new snapshot to the server
 * Uses chunked upload for large snapshots
 * 
 * @param name - The display name for the snapshot (will be sanitized for filename)
 * @param data - The snapshot data containing document and session state
 * @param parentId - Optional parent folder ID
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
    onProgress?: (progress: number) => void,
    parentId: string | null = null
): Promise<string> {
    // Use chunked upload for large data
    if (shouldUseChunking(data)) {
        const filename = `${name}.json`
        await uploadInChunks(API_URL, filename, data, onProgress, parentId)
        return filename
    }

    // Regular upload for small data
    const response = await fetch(`${API_URL}/api/snapshots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, data, parentId }),
    })

    const result = await response.json()

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
 * const data = await loadSnapshotFromServer('my-drawing.json')
 * loadSnapshot(editor.store, data)
 * ```
 */
export async function loadSnapshotFromServer(filename: string): Promise<TLEditorSnapshot> {
    const response = await fetch(`${API_URL}/api/snapshots/${encodeURIComponent(filename)}`)
    const data = await response.json()

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
 * @param data - The new snapshot data
 * @param onProgress - Optional progress callback for chunked uploads
 * @returns Promise that resolves when the update is complete
 * @throws Error if the update operation fails
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
    const response = await fetch(`${API_URL}/api/snapshots/${encodeURIComponent(filename)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
    })

    const result = await response.json()

    if (!result.success) {
        throw new Error(result.error || 'Failed to update snapshot')
    }
}

/**
 * Renames a snapshot file
 * 
 * @param filename - The current filename
 * @param newName - The new name for the snapshot
 * @returns Promise resolving to the new filename
 * @throws Error if the rename operation fails
 */
export async function renameSnapshot(
    filename: string,
    newName: string
): Promise<string> {
    const response = await fetch(
        `${API_URL}/api/snapshots/${encodeURIComponent(filename)}/rename`,
        {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newName }),
        }
    )

    const result = await response.json()

    if (result.success && result.filename) {
        return result.filename
    }

    throw new Error(result.error || 'Failed to rename snapshot')
}

/**
 * Moves a snapshot to a different folder
 * 
 * @param filename - The filename to move
 * @param targetFolderId - Target folder ID (null for root)
 * @returns Promise that resolves when the move is complete
 * @throws Error if the move operation fails
 */
export async function moveSnapshot(
    filename: string,
    targetFolderId: string | null
): Promise<void> {
    const response = await fetch(
        `${API_URL}/api/snapshots/${encodeURIComponent(filename)}/move`,
        {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetFolderId }),
        }
    )

    const result = await response.json()

    if (!result.success) {
        throw new Error(result.error || 'Failed to move snapshot')
    }
}

/**
 * Deletes a snapshot from the server
 * 
 * @param filename - The filename of the snapshot to delete
 * @returns Promise that resolves when the deletion is complete
 * @throws Error if the delete operation fails
 */
export async function deleteSnapshot(filename: string): Promise<void> {
    const response = await fetch(
        `${API_URL}/api/snapshots/${encodeURIComponent(filename)}`,
        { method: 'DELETE' }
    )

    const result = await response.json()

    if (!result.success) {
        throw new Error(result.error || 'Failed to delete snapshot')
    }
}

/**
 * Imports multiple snapshots from files
 * Auto-renames if duplicate names exist
 * 
 * @param files - Array of File objects to import
 * @param onProgress - Optional progress callback
 * @param parentId - Optional parent folder ID
 * @returns Promise resolving to array of created filenames
 */
export async function importSnapshots(
    files: File[],
    onProgress?: (current: number, total: number) => void,
    parentId: string | null = null
): Promise<string[]> {
    const filenames: string[] = []

    for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const name = file.name.replace('.json', '')
        
        try {
            const text = await file.text()
            const data = JSON.parse(text)

            const response = await fetch(`${API_URL}/api/snapshots/import`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, data, parentId }),
            })

            const result = await response.json()

            if (result.success && result.filename) {
                filenames.push(result.filename)
            }
        } catch (error) {
            console.error(`Failed to import ${file.name}:`, error)
        }

        if (onProgress) {
            onProgress(i + 1, files.length)
        }
    }

    return filenames
}

/**
 * Exports multiple snapshots as a single JSON file download
 * 
 * @param filenames - Array of filenames to export
 */
export async function exportSnapshots(filenames: string[]): Promise<void> {
    const response = await fetch(`${API_URL}/api/snapshots/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filenames }),
    })

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `snapshots-export-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
}

/**
 * Exports a single snapshot as a JSON file download
 * 
 * @param filename - The filename to export
 */
export async function exportSingleSnapshot(filename: string): Promise<void> {
    const data = await loadSnapshotFromServer(filename)
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
}

/**
 * Builds a tree structure from snapshots and folders
 * 
 * @param snapshots - Array of snapshot info
 * @param folders - Array of folder info
 * @returns Array of SnapshotItem with tree structure
 */
export function buildSnapshotTree(
    snapshots: SnapshotInfo[],
    folders: SnapshotFolder[]
): SnapshotItem[] {
    const items: SnapshotItem[] = []

    // Add root folders
    const rootFolders = folders.filter(f => f.parentId === null)
    for (const folder of rootFolders) {
        items.push({ ...folder, type: 'folder' })
    }

    // Add root snapshots
    const rootSnapshots = snapshots.filter(s => !s.parentId)
    for (const snapshot of rootSnapshots) {
        items.push({ ...snapshot, type: 'file' })
    }

    return items
}

/**
 * Gets all items in a specific folder
 * 
 * @param folderId - Folder ID (null for root)
 * @param snapshots - Array of all snapshots
 * @param folders - Array of all folders
 * @returns Array of SnapshotItem in the folder
 */
export function getFolderContents(
    folderId: string | null,
    snapshots: SnapshotInfo[],
    folders: SnapshotFolder[]
): SnapshotItem[] {
    const items: SnapshotItem[] = []

    // Add subfolders
    const childFolders = folders.filter(f => f.parentId === folderId)
    for (const folder of childFolders) {
        items.push({ ...folder, type: 'folder' })
    }

    // Add snapshots in this folder
    const folderSnapshots = snapshots.filter(s => s.parentId === folderId)
    for (const snapshot of folderSnapshots) {
        items.push({ ...snapshot, type: 'file' })
    }

    return items
}

/**
 * Gets the breadcrumb path for a folder
 * 
 * @param folderId - Folder ID
 * @param folders - Array of all folders
 * @returns Array of folders from root to the specified folder
 */
export function getFolderPath(
    folderId: string | null,
    folders: SnapshotFolder[]
): SnapshotFolder[] {
    if (!folderId) return []

    const path: SnapshotFolder[] = []
    let currentFolder = folders.find(f => f.id === folderId)

    while (currentFolder) {
        path.unshift(currentFolder)
        currentFolder = currentFolder.parentId 
            ? folders.find(f => f.id === currentFolder?.parentId) 
            : undefined
    }

    return path
}
