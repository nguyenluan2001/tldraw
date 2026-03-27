/**
 * Snapshot Toolbar Component
 * 
 * The main toolbar for the tldraw snapshot application. Provides buttons
 * for saving and loading snapshots, and displays the count of saved snapshots.
 * 
 * @module components/SnapshotToolbar
 */

import { useCallback, useEffect, useState } from 'react'
import { getSnapshot, loadSnapshot, useEditor } from 'tldraw'
import type { SnapshotInfo, NotificationState } from '../types'
import {
  fetchSnapshots,
  saveSnapshot,
  loadSnapshotFromServer,
  deleteSnapshot,
} from '../services/snapshotApi'
import SaveModal from './SaveModal'
import LoadModal from './LoadModal'
import Notification from './Notification'

/**
 * Main toolbar component for snapshot operations
 * 
 * Features:
 * - Save button to save current canvas state
 * - Load button to view and load saved snapshots
 * - Delete functionality for unwanted snapshots
 * - Notification system for user feedback
 * - Snapshot count display
 * - Tailwind CSS styling
 * 
 * This component is designed to be used as the SharePanel component
 * in tldraw's component configuration.
 * 
 * @returns JSX element with toolbar and modals
 * 
 * @example
 * ```tsx
 * <Tldraw
 *   components={{
 *     SharePanel: SnapshotToolbar,
 *   }}
 * />
 * ```
 */
function SnapshotToolbar() {
  /** tldraw editor instance for accessing store */
  const editor = useEditor()
  
  /** Controls visibility of the save modal */
  const [showSaveModal, setShowSaveModal] = useState(false)
  
  /** Controls visibility of the load modal */
  const [showLoadModal, setShowLoadModal] = useState(false)
  
  /** List of available snapshots from the server */
  const [snapshots, setSnapshots] = useState<SnapshotInfo[]>([])
  
  /** Loading state for snapshot operations */
  const [loading, setLoading] = useState(false)
  
  /** Current notification state for user feedback */
  const [notification, setNotification] = useState<NotificationState | null>(null)

  /**
   * Fetches the list of snapshots from the server
   * Updates the snapshots state and handles loading state
   */
  const handleFetchSnapshots = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchSnapshots()
      setSnapshots(data)
    } catch (error) {
      console.error('Failed to fetch snapshots:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Displays a notification message to the user
   * Auto-dismisses after 3 seconds
   * 
   * @param message - The message to display
   * @param type - Visual style (success or error)
   */
  const showNotification = useCallback((message: string, type: 'success' | 'error') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }, [])

  /**
   * Handles saving the current canvas state as a snapshot
   * Extracts document and session state from the editor and sends to server
   * 
   * @param name - The display name for the snapshot
   */
  const handleSave = useCallback(async (name: string) => {
    try {
      // Extract current editor state
      const { document, session } = getSnapshot(editor.store)
      
      // Save to server
      await saveSnapshot(name, { document, session })
      
      showNotification(`Snapshot "${name}" saved successfully!`, 'success')
      handleFetchSnapshots()
    } catch (error) {
      console.error('Failed to save snapshot:', error)
      showNotification('Failed to save snapshot', 'error')
    }
  }, [editor, handleFetchSnapshots, showNotification])

  /**
   * Handles loading a snapshot into the editor
   * Fetches snapshot data from server and applies to editor
   * 
   * @param filename - The filename of the snapshot to load
   */
  const handleLoad = useCallback(async (filename: string) => {
    try {
      const data = await loadSnapshotFromServer(filename)
      loadSnapshot(editor.store, data)
      showNotification('Snapshot loaded successfully!', 'success')
    } catch (error) {
      console.error('Failed to load snapshot:', error)
      showNotification('Failed to load snapshot', 'error')
    }
  }, [editor, showNotification])

  /**
   * Handles deleting a snapshot from the server
   * 
   * @param filename - The filename of the snapshot to delete
   */
  const handleDelete = useCallback(async (filename: string) => {
    try {
      await deleteSnapshot(filename)
      showNotification('Snapshot deleted', 'success')
      handleFetchSnapshots()
    } catch (error) {
      console.error('Failed to delete snapshot:', error)
      showNotification('Failed to delete snapshot', 'error')
    }
  }, [handleFetchSnapshots, showNotification])

  // Fetch snapshots on component mount
  useEffect(() => {
    handleFetchSnapshots()
  }, [handleFetchSnapshots])

  return (
    <>
      {/* Main toolbar container */}
      <div className="px-4 py-2 pointer-events-auto flex gap-2 items-center">
        {/* Save button */}
        <button
          onClick={() => setShowSaveModal(true)}
          className="px-4 py-2 bg-green-500 text-white rounded font-medium hover:bg-green-600"
        >
          💾 Save Snapshot
        </button>
        
        {/* Load button */}
        <button
          onClick={() => {
            handleFetchSnapshots()
            setShowLoadModal(true)
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded font-medium hover:bg-blue-600"
        >
          📂 Load Snapshot
        </button>
        
        {/* Snapshot count indicator */}
        {snapshots.length > 0 && (
          <span className="text-xs text-gray-500">
            {snapshots.length} snapshot{snapshots.length !== 1 ? 's' : ''} saved
          </span>
        )}
      </div>

      {/* Notification toast */}
      <Notification notification={notification} />

      {/* Save modal */}
      <SaveModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSave}
      />

      {/* Load modal */}
      <LoadModal
        isOpen={showLoadModal}
        onClose={() => setShowLoadModal(false)}
        snapshots={snapshots}
        onLoad={handleLoad}
        onDelete={handleDelete}
        loading={loading}
      />
    </>
  )
}

export default SnapshotToolbar
