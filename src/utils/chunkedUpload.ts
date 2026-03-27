/**
 * Chunked Upload Utility
 * 
 * Provides functionality to upload large snapshots in chunks,
 * avoiding payload size limits and improving reliability.
 * 
 * @module utils/chunkedUpload
 */

/** Default chunk size: 1MB */
const DEFAULT_CHUNK_SIZE = 1024 * 1024

/**
 * Splits data into chunks of specified size
 * 
 * @param data - The data object to chunk
 * @param chunkSize - Size of each chunk in bytes (default: 1MB)
 * @returns Array of chunks with index and total chunks info
 */
function createChunks(data: unknown, chunkSize: number = DEFAULT_CHUNK_SIZE): {
  chunks: string[]
  totalChunks: number
} {
  const jsonString = JSON.stringify(data)
  const totalSize = jsonString.length
  const totalChunks = Math.ceil(totalSize / chunkSize)
  
  const chunks: string[] = []
  
  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize
    const end = Math.min(start + chunkSize, totalSize)
    chunks.push(jsonString.slice(start, end))
  }
  
  return { chunks, totalChunks }
}

/**
 * Uploads data in chunks to the server
 *
 * @param apiUrl - Base API URL
 * @param filename - Target filename
 * @param data - Data to upload
 * @param onProgress - Optional progress callback
 * @param parentId - Optional parent folder ID
 * @returns Promise resolving when upload is complete
 */
export async function uploadInChunks(
  apiUrl: string,
  filename: string,
  data: unknown,
  onProgress?: (progress: number) => void,
  parentId: string | null = null
): Promise<void> {
  const { chunks, totalChunks } = createChunks(data)
  const uploadId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  // Upload each chunk
  for (let i = 0; i < chunks.length; i++) {
    const response = await fetch(`${apiUrl}/api/snapshots/chunk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uploadId,
        filename,
        chunkIndex: i,
        totalChunks,
        chunkData: chunks[i],
        isLastChunk: i === chunks.length - 1,
        parentId,
      }),
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || `Failed to upload chunk ${i + 1}`)
    }
    
    // Report progress
    if (onProgress) {
      onProgress(((i + 1) / totalChunks) * 100)
    }
  }
}

/**
 * Updates an existing snapshot in chunks
 * 
 * @param apiUrl - Base API URL
 * @param filename - Target filename
 * @param data - Data to upload
 * @param onProgress - Optional progress callback
 * @returns Promise resolving when update is complete
 */
export async function updateInChunks(
  apiUrl: string,
  filename: string,
  data: unknown,
  onProgress?: (progress: number) => void
): Promise<void> {
  const { chunks, totalChunks } = createChunks(data)
  const uploadId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  // Upload each chunk
  for (let i = 0; i < chunks.length; i++) {
    const response = await fetch(`${apiUrl}/api/snapshots/${filename}/chunk`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uploadId,
        chunkIndex: i,
        totalChunks,
        chunkData: chunks[i],
        isLastChunk: i === chunks.length - 1,
      }),
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || `Failed to upload chunk ${i + 1}`)
    }
    
    // Report progress
    if (onProgress) {
      onProgress(((i + 1) / totalChunks) * 100)
    }
  }
}

/**
 * Checks if data should be chunked based on size
 *
 * @param data - Data to check
 * @param threshold - Size threshold in bytes (default: 1MB to be safe)
 * @returns True if data should be chunked
 */
export function shouldUseChunking(data: unknown, threshold: number = 1024 * 1024): boolean {
  const jsonString = JSON.stringify(data)
  return jsonString.length > threshold
}
