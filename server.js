/**
 * Snapshot Storage Server
 *
 * A simple Express.js server that provides REST API endpoints for
 * saving, loading, and deleting tldraw snapshots with folder support.
 * Snapshots are stored as JSON files in the storage directory with
 * a folder structure managed by a metadata file.
 *
 * Configuration via environment variables:
 * - SERVER_HOST: The host to bind to (default: localhost)
 * - SERVER_PORT: The port to listen on (default: 3002)
 *
 * @module server
 */

import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { v4 as uuidv4 } from 'uuid'

// Load environment variables from .env file
dotenv.config()

// ES Module compatibility for __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Express application instance
const app = express()

// Server configuration from environment variables
const HOST = process.env.SERVER_HOST || 'localhost'
const PORT = process.env.SERVER_PORT || 3002

// Middleware configuration
app.use(cors())
// Increase JSON body limit for large snapshots (50MB)
app.use(express.json({ limit: '50mb' }))

/**
 * Storage directory for snapshot files
 * Located at ./storage relative to this file
 */
const STORAGE_DIR = path.join(__dirname, 'storage')

/**
 * Metadata file for storing folder structure
 */
const METADATA_FILE = path.join(STORAGE_DIR, '.metadata.json')

/**
 * Default metadata structure
 */
const DEFAULT_METADATA = {
  folders: [],
  fileMap: {} // filename -> { parentId, path }
}

/**
 * Ensures the storage directory exists on server startup
 * Creates the directory recursively if it doesn't exist
 */
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true })
}

/**
 * Loads metadata from file, creates default if not exists
 * @returns {Object} Metadata object with folders and fileMap
 */
function loadMetadata() {
  try {
    if (fs.existsSync(METADATA_FILE)) {
      const data = fs.readFileSync(METADATA_FILE, 'utf-8')
      return JSON.parse(data)
    }
  } catch (error) {
    console.error('Error loading metadata:', error)
  }
  return { ...DEFAULT_METADATA }
}

/**
 * Saves metadata to file
 * @param {Object} metadata - Metadata object to save
 */
function saveMetadata(metadata) {
  try {
    fs.writeFileSync(METADATA_FILE, JSON.stringify(metadata, null, 2))
  } catch (error) {
    console.error('Error saving metadata:', error)
  }
}

/**
 * Gets the full path for a folder
 * @param {string} folderId - Folder ID
 * @param {Object} metadata - Metadata object
 * @returns {string} Full folder path
 */
function getFolderPath(folderId, metadata) {
  if (!folderId) return ''
  
  const folder = metadata.folders.find(f => f.id === folderId)
  if (!folder) return ''
  
  const parentPath = getFolderPath(folder.parentId, metadata)
  return parentPath ? `${parentPath}/${folder.name}` : folder.name
}

/**
 * Gets all descendant folder IDs of a folder
 * @param {string} folderId - Parent folder ID
 * @param {Object} metadata - Metadata object
 * @returns {string[]} Array of descendant folder IDs
 */
function getDescendantFolderIds(folderId, metadata) {
  const descendants = []
  const children = metadata.folders.filter(f => f.parentId === folderId)
  
  for (const child of children) {
    descendants.push(child.id)
    descendants.push(...getDescendantFolderIds(child.id, metadata))
  }
  
  return descendants
}

/**
 * Recursively reads directory and returns all JSON files
 * @param {string} dir - Directory to read
 * @param {string} basePath - Base path for relative paths
 * @returns {Array} Array of file info objects
 */
function readFilesRecursively(dir, basePath = '') {
  const files = []
  
  if (!fs.existsSync(dir)) return files
  
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name
    
    if (entry.isDirectory()) {
      // Recursively read subdirectories
      files.push(...readFilesRecursively(fullPath, relativePath))
    } else if (entry.name.endsWith('.json') && entry.name !== '.metadata.json') {
      // Add JSON files (excluding metadata)
      const stats = fs.statSync(fullPath)
      files.push({
        name: entry.name.replace('.json', ''),
        filename: entry.name,
        path: relativePath,
        createdAt: stats.birthtime,
        size: stats.size
      })
    }
  }
  
  return files
}

/**
 * GET /api/snapshots
 * 
 * Retrieves a list of all saved snapshots with metadata, organized by folders.
 * Returns snapshots sorted by creation date (newest first).
 * 
 * @returns {Object} JSON response with success flag, snapshots, and folders
 */
app.get('/api/snapshots', (req, res) => {
  try {
    const metadata = loadMetadata()
    
    // Read all files from storage directory
    const files = fs.readdirSync(STORAGE_DIR)
    const snapshots = files
      .filter(file => file.endsWith('.json') && file !== '.metadata.json')
      .map(file => {
        const filePath = path.join(STORAGE_DIR, file)
        const stats = fs.statSync(filePath)
        const fileInfo = metadata.fileMap[file] || {}
        
        return {
          name: file.replace('.json', ''),
          filename: file,
          createdAt: stats.birthtime,
          size: stats.size,
          path: fileInfo.path || file,
          parentId: fileInfo.parentId || null
        }
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    
    res.json({ 
      success: true, 
      snapshots,
      folders: metadata.folders
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/folders
 * 
 * Retrieves all folders.
 * 
 * @returns {Object} JSON response with folders array
 */
app.get('/api/folders', (req, res) => {
  try {
    const metadata = loadMetadata()
    res.json({ success: true, folders: metadata.folders })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /api/folders
 * 
 * Creates a new folder.
 * 
 * @body {name: string, parentId: string|null} - Folder name and parent ID
 * @returns {Object} JSON response with the created folder
 */
app.post('/api/folders', (req, res) => {
  try {
    const { name, parentId = null } = req.body
    
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Folder name is required' })
    }

    const metadata = loadMetadata()
    
    // Check for duplicate folder name in same parent
    const existingFolder = metadata.folders.find(
      f => f.name === name.trim() && f.parentId === parentId
    )
    
    if (existingFolder) {
      return res.status(409).json({ 
        success: false, 
        error: 'A folder with this name already exists in this location' 
      })
    }
    
    const folder = {
      id: uuidv4(),
      name: name.trim(),
      parentId,
      path: getFolderPath(parentId, metadata) 
        ? `${getFolderPath(parentId, metadata)}/${name.trim()}`
        : name.trim(),
      createdAt: new Date().toISOString()
    }
    
    metadata.folders.push(folder)
    saveMetadata(metadata)
    
    res.json({ success: true, folder })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * PATCH /api/folders/:id
 * 
 * Renames a folder.
 * 
 * @param {string} id - Folder ID
 * @body {name: string} - New folder name
 * @returns {Object} JSON response with updated folder
 */
app.patch('/api/folders/:id', (req, res) => {
  try {
    const { id } = req.params
    const { name } = req.body
    
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Folder name is required' })
    }

    const metadata = loadMetadata()
    
    const folderIndex = metadata.folders.findIndex(f => f.id === id)
    
    if (folderIndex === -1) {
      return res.status(404).json({ success: false, error: 'Folder not found' })
    }
    
    const folder = metadata.folders[folderIndex]
    
    // Check for duplicate folder name in same parent
    const existingFolder = metadata.folders.find(
      f => f.name === name.trim() && f.parentId === folder.parentId && f.id !== id
    )
    
    if (existingFolder) {
      return res.status(409).json({ 
        success: false, 
        error: 'A folder with this name already exists in this location' 
      })
    }
    
    // Update folder name and path
    const oldPath = folder.path
    folder.name = name.trim()
    folder.path = folder.parentId 
      ? `${getFolderPath(folder.parentId, metadata)}/${name.trim()}`
      : name.trim()
    
    // Update paths of all descendant folders
    const updateDescendantPaths = (parentId, newParentPath) => {
      metadata.folders
        .filter(f => f.parentId === parentId)
        .forEach(f => {
          f.path = newParentPath ? `${newParentPath}/${f.name}` : f.name
          updateDescendantPaths(f.id, f.path)
        })
    }
    
    updateDescendantPaths(id, folder.path)
    
    // Update file paths for files in this folder and subfolders
    const descendantIds = [id, ...getDescendantFolderIds(id, metadata)]
    for (const [filename, fileInfo] of Object.entries(metadata.fileMap)) {
      if (descendantIds.includes(fileInfo.parentId)) {
        const parentFolder = metadata.folders.find(f => f.id === fileInfo.parentId)
        if (parentFolder) {
          fileInfo.path = parentFolder.path
        }
      }
    }
    
    metadata.folders[folderIndex] = folder
    saveMetadata(metadata)
    
    res.json({ success: true, folder })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * DELETE /api/folders/:id
 * 
 * Deletes a folder and optionally its contents.
 * 
 * @param {string} id - Folder ID
 * @query {boolean} deleteContents - Whether to delete files in the folder
 * @returns {Object} JSON response with success flag
 */
app.delete('/api/folders/:id', (req, res) => {
  try {
    const { id } = req.params
    const { deleteContents = false } = req.query
    
    const metadata = loadMetadata()
    
    const folderIndex = metadata.folders.findIndex(f => f.id === id)
    
    if (folderIndex === -1) {
      return res.status(404).json({ success: false, error: 'Folder not found' })
    }
    
    // Get all descendant folder IDs
    const descendantIds = [id, ...getDescendantFolderIds(id, metadata)]
    
    // Handle files in folders
    if (deleteContents) {
      // Delete files in these folders
      for (const [filename, fileInfo] of Object.entries(metadata.fileMap)) {
        if (descendantIds.includes(fileInfo.parentId)) {
          const filePath = path.join(STORAGE_DIR, filename)
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath)
          }
          delete metadata.fileMap[filename]
        }
      }
    } else {
      // Move files to root
      for (const [filename, fileInfo] of Object.entries(metadata.fileMap)) {
        if (descendantIds.includes(fileInfo.parentId)) {
          fileInfo.parentId = null
          fileInfo.path = filename
        }
      }
    }
    
    // Remove folders
    metadata.folders = metadata.folders.filter(f => !descendantIds.includes(f.id))
    saveMetadata(metadata)
    
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /api/snapshots
 * 
 * Saves a new snapshot to the server.
 * The name is sanitized to prevent filesystem issues.
 * 
 * @body {name: string, data: object, parentId: string|null} - Snapshot name, data, and parent folder
 * @returns {Object} JSON response with success flag and filename
 */
app.post('/api/snapshots', (req, res) => {
  try {
    const { name, data, parentId = null } = req.body
    
    if (!name || !data) {
      return res.status(400).json({ success: false, error: 'Name and data are required' })
    }

    // Sanitize filename to prevent filesystem issues
    const sanitizedName = name.replace(/[^a-zA-Z0-9_-]/g, '_')
    const filename = `${sanitizedName}.json`
    const filePath = path.join(STORAGE_DIR, filename)
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
    
    // Update metadata
    const metadata = loadMetadata()
    const parentFolder = metadata.folders.find(f => f.id === parentId)
    
    metadata.fileMap[filename] = {
      parentId,
      path: parentFolder 
        ? `${parentFolder.path}/${filename}`
        : filename
    }
    saveMetadata(metadata)
    
    res.json({ 
      success: true, 
      filename, 
      name: sanitizedName,
      path: metadata.fileMap[filename].path,
      parentId
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * GET /api/snapshots/:filename
 * 
 * Loads a snapshot by filename.
 * 
 * @param {string} filename - The filename to load
 * @returns {Object} JSON response with success flag and snapshot data
 */
app.get('/api/snapshots/:filename', (req, res) => {
  try {
    const { filename } = req.params
    
    // Security: prevent directory traversal attacks
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ success: false, error: 'Invalid filename' })
    }

    const filePath = path.join(STORAGE_DIR, filename)
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'Snapshot not found' })
    }
    
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * PUT /api/snapshots/:filename
 *
 * Updates an existing snapshot by filename.
 *
 * @param {string} filename - The filename to update
 * @body {data: object} - Snapshot data to update
 * @returns {Object} JSON response with success flag
 */
app.put('/api/snapshots/:filename', (req, res) => {
  try {
    const { filename } = req.params
    const { data } = req.body
    
    // Security: prevent directory traversal attacks
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ success: false, error: 'Invalid filename' })
    }

    if (!data) {
      return res.status(400).json({ success: false, error: 'Data is required' })
    }

    const filePath = path.join(STORAGE_DIR, filename)
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'Snapshot not found' })
    }
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * PATCH /api/snapshots/:filename/rename
 *
 * Renames a snapshot file.
 *
 * @param {string} filename - The current filename
 * @body {newName: string} - The new name for the snapshot
 * @returns {Object} JSON response with success flag and new filename
 */
app.patch('/api/snapshots/:filename/rename', (req, res) => {
  try {
    const { filename } = req.params
    const { newName } = req.body
    
    // Security: prevent directory traversal attacks
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ success: false, error: 'Invalid filename' })
    }

    if (!newName) {
      return res.status(400).json({ success: false, error: 'New name is required' })
    }

    const oldFilePath = path.join(STORAGE_DIR, filename)
    
    if (!fs.existsSync(oldFilePath)) {
      return res.status(404).json({ success: false, error: 'Snapshot not found' })
    }

    // Sanitize new name and create new filename
    const sanitizedName = newName.replace(/[^a-zA-Z0-9_-]/g, '_')
    const newFilename = `${sanitizedName}.json`
    const newFilePath = path.join(STORAGE_DIR, newFilename)

    // Check if new filename already exists
    if (fs.existsSync(newFilePath) && filename !== newFilename) {
      return res.status(409).json({ success: false, error: 'A snapshot with this name already exists' })
    }

    // Rename the file
    fs.renameSync(oldFilePath, newFilePath)
    
    // Update metadata
    const metadata = loadMetadata()
    if (metadata.fileMap[filename]) {
      metadata.fileMap[newFilename] = {
        ...metadata.fileMap[filename],
        path: metadata.fileMap[filename].path.replace(filename, newFilename)
      }
      delete metadata.fileMap[filename]
      saveMetadata(metadata)
    }
    
    res.json({ success: true, filename: newFilename, name: sanitizedName })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * PATCH /api/snapshots/:filename/move
 *
 * Moves a snapshot to a different folder.
 *
 * @param {string} filename - The filename to move
 * @body {targetFolderId: string|null} - Target folder ID (null for root)
 * @returns {Object} JSON response with success flag
 */
app.patch('/api/snapshots/:filename/move', (req, res) => {
  try {
    const { filename } = req.params
    const { targetFolderId = null } = req.body
    
    // Security: prevent directory traversal attacks
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ success: false, error: 'Invalid filename' })
    }

    const filePath = path.join(STORAGE_DIR, filename)
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'Snapshot not found' })
    }

    // Validate target folder exists
    const metadata = loadMetadata()
    
    if (targetFolderId) {
      const targetFolder = metadata.folders.find(f => f.id === targetFolderId)
      if (!targetFolder) {
        return res.status(404).json({ success: false, error: 'Target folder not found' })
      }
    }
    
    // Update file mapping
    const targetFolder = metadata.folders.find(f => f.id === targetFolderId)
    metadata.fileMap[filename] = {
      parentId: targetFolderId,
      path: targetFolder 
        ? `${targetFolder.path}/${filename}`
        : filename
    }
    saveMetadata(metadata)
    
    res.json({ 
      success: true, 
      path: metadata.fileMap[filename].path,
      parentId: targetFolderId
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * DELETE /api/snapshots/:filename
 *
 * Deletes a snapshot by filename.
 *
 * @param {string} filename - The filename to delete
 * @returns {Object} JSON response with success flag
 */
app.delete('/api/snapshots/:filename', (req, res) => {
  try {
    const { filename } = req.params
    
    // Security: prevent directory traversal attacks
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ success: false, error: 'Invalid filename' })
    }

    const filePath = path.join(STORAGE_DIR, filename)
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'Snapshot not found' })
    }
    
    fs.unlinkSync(filePath)
    
    // Update metadata
    const metadata = loadMetadata()
    delete metadata.fileMap[filename]
    saveMetadata(metadata)
    
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * In-memory storage for chunk uploads
 * Maps uploadId -> { chunks: Map<chunkIndex, chunkData>, filename, totalChunks }
 */
const chunkUploads = new Map()

/**
 * Cleanup old chunk uploads every 5 minutes
 */
setInterval(() => {
  const now = Date.now()
  for (const [uploadId, upload] of chunkUploads) {
    // Remove uploads older than 10 minutes
    if (now - upload.createdAt > 10 * 60 * 1000) {
      chunkUploads.delete(uploadId)
    }
  }
}, 5 * 60 * 1000)

/**
 * POST /api/snapshots/chunk
 *
 * Receives a chunk of data for chunked upload.
 * When the last chunk is received, assembles and saves the file.
 */
app.post('/api/snapshots/chunk', (req, res) => {
  try {
    const { uploadId, filename, chunkIndex, totalChunks, chunkData, isLastChunk, parentId = null } = req.body
    
    if (!uploadId || chunkIndex === undefined || !chunkData || !totalChunks) {
      return res.status(400).json({ success: false, error: 'Missing required fields' })
    }

    // Initialize or get existing upload
    if (!chunkUploads.has(uploadId)) {
      chunkUploads.set(uploadId, {
        filename,
        totalChunks,
        chunks: new Map(),
        parentId,
        createdAt: Date.now(),
      })
    }
    
    const upload = chunkUploads.get(uploadId)
    upload.chunks.set(chunkIndex, chunkData)
    
    // If this is the last chunk, assemble and save
    if (isLastChunk) {
      // Verify all chunks are present
      if (upload.chunks.size !== totalChunks) {
        return res.status(400).json({ success: false, error: 'Missing chunks' })
      }
      
      // Assemble chunks in order
      const orderedChunks = []
      for (let i = 0; i < totalChunks; i++) {
        orderedChunks.push(upload.chunks.get(i))
      }
      
      const fullData = orderedChunks.join('')
      const sanitizedName = filename.replace('.json', '').replace(/[^a-zA-Z0-9_-]/g, '_')
      const finalFilename = `${sanitizedName}.json`
      const filePath = path.join(STORAGE_DIR, finalFilename)
      
      // Parse and save
      const parsedData = JSON.parse(fullData)
      fs.writeFileSync(filePath, JSON.stringify(parsedData, null, 2))
      
      // Update metadata
      const metadata = loadMetadata()
      const parentFolder = metadata.folders.find(f => f.id === upload.parentId)
      
      metadata.fileMap[finalFilename] = {
        parentId: upload.parentId,
        path: parentFolder 
          ? `${parentFolder.path}/${finalFilename}`
          : finalFilename
      }
      saveMetadata(metadata)
      
      // Cleanup
      chunkUploads.delete(uploadId)
      
      return res.json({ 
        success: true, 
        filename: finalFilename, 
        name: sanitizedName,
        path: metadata.fileMap[finalFilename].path,
        parentId: upload.parentId
      })
    }
    
    res.json({ success: true, chunkIndex, received: upload.chunks.size })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * PUT /api/snapshots/:filename/chunk
 *
 * Receives chunks for updating an existing snapshot.
 */
app.put('/api/snapshots/:filename/chunk', (req, res) => {
  try {
    const { filename } = req.params
    const { uploadId, chunkIndex, totalChunks, chunkData, isLastChunk } = req.body
    
    // Security: prevent directory traversal attacks
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ success: false, error: 'Invalid filename' })
    }

    if (!uploadId || chunkIndex === undefined || !chunkData || !totalChunks) {
      return res.status(400).json({ success: false, error: 'Missing required fields' })
    }

    // Initialize or get existing upload
    const uploadKey = `${uploadId}-${filename}`
    if (!chunkUploads.has(uploadKey)) {
      chunkUploads.set(uploadKey, {
        filename,
        totalChunks,
        chunks: new Map(),
        createdAt: Date.now(),
      })
    }
    
    const upload = chunkUploads.get(uploadKey)
    upload.chunks.set(chunkIndex, chunkData)
    
    // If this is the last chunk, assemble and save
    if (isLastChunk) {
      if (upload.chunks.size !== totalChunks) {
        return res.status(400).json({ success: false, error: 'Missing chunks' })
      }
      
      const filePath = path.join(STORAGE_DIR, filename)
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, error: 'Snapshot not found' })
      }
      
      // Assemble chunks in order
      const orderedChunks = []
      for (let i = 0; i < totalChunks; i++) {
        orderedChunks.push(upload.chunks.get(i))
      }
      
      const fullData = orderedChunks.join('')
      const parsedData = JSON.parse(fullData)
      fs.writeFileSync(filePath, JSON.stringify(parsedData, null, 2))
      
      // Cleanup
      chunkUploads.delete(uploadKey)
      
      return res.json({ success: true })
    }
    
    res.json({ success: true, chunkIndex, received: upload.chunks.size })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /api/snapshots/import
 *
 * Imports a snapshot, auto-renaming if duplicate exists.
 * Returns the actual name used (may differ from requested name).
 */
app.post('/api/snapshots/import', (req, res) => {
  try {
    const { name, data, parentId = null } = req.body
    
    if (!name || !data) {
      return res.status(400).json({ success: false, error: 'Name and data are required' })
    }

    // Sanitize name
    let sanitizedName = name.replace(/[^a-zA-Z0-9_-]/g, '_')
    let filename = `${sanitizedName}.json`
    let filePath = path.join(STORAGE_DIR, filename)
    
    // Check for duplicate and auto-rename
    let counter = 1
    while (fs.existsSync(filePath)) {
      sanitizedName = `${name.replace(/[^a-zA-Z0-9_-]/g, '_')}_${counter}`
      filename = `${sanitizedName}.json`
      filePath = path.join(STORAGE_DIR, filename)
      counter++
    }
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
    
    // Update metadata
    const metadata = loadMetadata()
    const parentFolder = metadata.folders.find(f => f.id === parentId)
    
    metadata.fileMap[filename] = {
      parentId,
      path: parentFolder 
        ? `${parentFolder.path}/${filename}`
        : filename
    }
    saveMetadata(metadata)
    
    res.json({ 
      success: true, 
      filename, 
      name: sanitizedName,
      path: metadata.fileMap[filename].path,
      parentId
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * POST /api/snapshots/export
 *
 * Exports multiple snapshots as a single JSON file.
 */
app.post('/api/snapshots/export', (req, res) => {
  try {
    const { filenames } = req.body
    
    if (!filenames || !Array.isArray(filenames) || filenames.length === 0) {
      return res.status(400).json({ success: false, error: 'Filenames array is required' })
    }

    const exportData = {}
    
    for (const filename of filenames) {
      // Security: prevent directory traversal attacks
      if (filename.includes('..') || filename.includes('/')) {
        continue
      }
      
      const filePath = path.join(STORAGE_DIR, filename)
      
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
        exportData[filename] = data
      }
    }
    
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="snapshots-export-${Date.now()}.json"`)
    res.send(JSON.stringify(exportData, null, 2))
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

/**
 * Start the server
 */
app.listen(PORT, () => {
  console.log(`Snapshot server running on http://${HOST}:${PORT}`)
  console.log(`Snapshots stored in: ${STORAGE_DIR}`)
})
