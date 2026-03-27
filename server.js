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
app.use(express.json())

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
 * Start the server
 */
app.listen(PORT, () => {
  console.log(`Snapshot server running on http://${HOST}:${PORT}`)
  console.log(`Snapshots stored in: ${STORAGE_DIR}`)
})
