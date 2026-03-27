/**
 * Snapshot Storage Server
 *
 * A simple Express.js server that provides REST API endpoints for
 * saving, loading, and deleting tldraw snapshots. Snapshots are stored
 * as JSON files in the storage directory.
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
 * Ensures the storage directory exists on server startup
 * Creates the directory recursively if it doesn't exist
 */
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true })
}

/**
 * GET /api/snapshots
 * 
 * Retrieves a list of all saved snapshots with metadata.
 * Returns snapshots sorted by creation date (newest first).
 * 
 * @returns {Object} JSON response with success flag and snapshots array
 */
app.get('/api/snapshots', (req, res) => {
  try {
    const files = fs.readdirSync(STORAGE_DIR)
    const snapshots = files
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const filePath = path.join(STORAGE_DIR, file)
        const stats = fs.statSync(filePath)
        return {
          name: file.replace('.json', ''),
          filename: file,
          createdAt: stats.birthtime,
          size: stats.size
        }
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    
    res.json({ success: true, snapshots })
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
 * @body {name: string, data: object} - Snapshot name and data
 * @returns {Object} JSON response with success flag and filename
 */
app.post('/api/snapshots', (req, res) => {
  try {
    const { name, data } = req.body
    
    if (!name || !data) {
      return res.status(400).json({ success: false, error: 'Name and data are required' })
    }

    // Sanitize filename to prevent filesystem issues
    const sanitizedName = name.replace(/[^a-zA-Z0-9_-]/g, '_')
    const filename = `${sanitizedName}.json`
    const filePath = path.join(STORAGE_DIR, filename)
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
    
    res.json({ success: true, filename, name: sanitizedName })
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
    
    res.json({ success: true, filename: newFilename, name: sanitizedName })
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
    const { uploadId, filename, chunkIndex, totalChunks, chunkData, isLastChunk } = req.body
    
    if (!uploadId || chunkIndex === undefined || !chunkData || !totalChunks) {
      return res.status(400).json({ success: false, error: 'Missing required fields' })
    }

    // Initialize or get existing upload
    if (!chunkUploads.has(uploadId)) {
      chunkUploads.set(uploadId, {
        filename,
        totalChunks,
        chunks: new Map(),
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
      
      // Cleanup
      chunkUploads.delete(uploadId)
      
      return res.json({ success: true, filename: finalFilename, name: sanitizedName })
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
    const { name, data } = req.body
    
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
    
    res.json({ success: true, filename, name: sanitizedName })
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
