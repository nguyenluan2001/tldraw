/**
 * Snapshot Toolbar Component
 * 
 * The main toolbar for the tldraw snapshot application. Provides buttons
 * for saving and loading snapshots, displays the count of saved snapshots,
 * and manages auto-save functionality for the current snapshot.
 * 
 * @module components/SnapshotToolbar
 */

import { useCallback, useEffect, useState, useRef } from 'react'
import { getSnapshot, loadSnapshot, useEditor } from 'tldraw'
import type { SnapshotInfo, NotificationState } from '../types'
import {
  fetchSnapshots,
  saveSnapshot,
  loadSnapshotFromServer,
  deleteSnapshot,
  updateSnapshot,
} from '../services/snapshotApi'
import SaveModal from './SaveModal'
import LoadModal from './LoadModal'
import Notification from './Notification'

/** Auto-save interval in milliseconds (5 seconds) */
const AUTO_SAVE_INTERVAL = 5000

/**
 * Main toolbar component for snapshot operations
 * 
 * Features:
 * - Save button to save current canvas state
 * - Load button to view and load saved snapshots
 * - Delete functionality for unwanted snapshots
 * - Notification system for user feedback
 * - Snapshot count display
 * - Auto-save to current snapshot (toggleable)
 * - Manual update button when auto-save is off
 * - Shows current active snapshot name
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
  
  /** Current active snapshot (when auto-save is enabled) */
  const [currentSnapshot, setCurrentSnapshot] = useState<{ name: string; filename: string } | null>(null)
  
  /** Auto-save enabled state */
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true)
  
  /** Saving state for update operation */
  const [isSaving, setIsSaving] = useState(false)
  
  /** Reference to track if we're currently saving (to prevent auto-save during manual save) */
  const isSavingRef = useRef(false)

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
   * Saves the current canvas state to a snapshot
   * After saving, sets it as the current snapshot with auto-save enabled
   * 
   * @param name - The display name for the snapshot
   */
  const handleSave = useCallback(async (name: string) => {
    isSavingRef.current = true
    setIsSaving(true)
    try {
      // Extract current editor state
      const { document, session } = getSnapshot(editor.store)
      
      // Save to server
      const filename = await saveSnapshot(name, { document, session })
      
      // Set as current snapshot and enable auto-save
      setCurrentSnapshot({ name, filename })
      setAutoSaveEnabled(true)
      
      showNotification(`Snapshot "${name}" saved! Auto-save enabled.`, 'success')
      handleFetchSnapshots()
    } catch (error) {
      console.error('Failed to save snapshot:', error)
      showNotification('Failed to save snapshot', 'error')
    } finally {
      isSavingRef.current = false
      setIsSaving(false)
    }
  }, [editor, handleFetchSnapshots, showNotification])

  /**
   * Handles loading a snapshot into the editor
   * Fetches snapshot data from server and applies to editor
   * Sets it as current snapshot with auto-save enabled
   * 
   * @param filename - The filename of the snapshot to load
   */
  const handleLoad = useCallback(async (filename: string) => {
    try {
      const data = await loadSnapshotFromServer(filename)
      loadSnapshot(editor.store, data as any)
      
      // Extract name from filename (remove .json extension)
      const name = filename.replace('.json', '')
      
      // Set as current snapshot and enable auto-save
      setCurrentSnapshot({ name, filename })
      setAutoSaveEnabled(true)
      
      showNotification(`Snapshot "${name}" loaded! Auto-save enabled.`, 'success')
    } catch (error) {
      console.error('Failed to load snapshot:', error)
      showNotification('Failed to load snapshot', 'error')
    }
  }, [editor, showNotification])

  /**
   * Handles deleting a snapshot from the server
   * If deleting the current snapshot, disables auto-save
   * 
   * @param filename - The filename of the snapshot to delete
   */
  const handleDelete = useCallback(async (filename: string) => {
    try {
      await deleteSnapshot(filename)
      
      // If deleting current snapshot, disable auto-save
      if (currentSnapshot?.filename === filename) {
        setCurrentSnapshot(null)
        setAutoSaveEnabled(true)
      }
      
      showNotification('Snapshot deleted', 'success')
      handleFetchSnapshots()
    } catch (error) {
      console.error('Failed to delete snapshot:', error)
      showNotification('Failed to delete snapshot', 'error')
    }
  }, [currentSnapshot, handleFetchSnapshots, showNotification])

  /**
   * Toggles auto-save on/off
   */
  const toggleAutoSave = useCallback(() => {
    if (!currentSnapshot) {
      showNotification('Save or load a snapshot first', 'error')
      return
    }
    setAutoSaveEnabled(prev => !prev)
    showNotification(autoSaveEnabled ? 'Auto-save disabled' : 'Auto-save enabled', 'success')
  }, [currentSnapshot, autoSaveEnabled, showNotification])

  /**
   * Manually updates the current snapshot
   */
  const handleManualUpdate = useCallback(async () => {
    if (!currentSnapshot) {
      showNotification('No current snapshot to update', 'error')
      return
    }

    isSavingRef.current = true
    setIsSaving(true)
    try {
      const { document, session } = getSnapshot(editor.store)
      await updateSnapshot(currentSnapshot.filename, { document, session })
      showNotification(`Snapshot "${currentSnapshot.name}" updated!`, 'success')
    } catch (error) {
      console.error('Failed to update snapshot:', error)
      showNotification('Failed to update snapshot', 'error')
    } finally {
      isSavingRef.current = false
      setIsSaving(false)
    }
  }, [currentSnapshot, editor, showNotification])

  /**
   * Auto-save effect - saves current snapshot periodically when enabled
   */
  useEffect(() => {
    if (!autoSaveEnabled || !currentSnapshot || isSavingRef.current) {
      return
    }

    const autoSave = async () => {
      if (isSavingRef.current) return
      
      isSavingRef.current = true
      try {
        const { document, session } = getSnapshot(editor.store)
        await updateSnapshot(currentSnapshot.filename, { document, session })
        // Silent save - no notification for auto-save
      } catch (error) {
        console.error('Auto-save failed:', error)
      } finally {
        isSavingRef.current = false
      }
    }

    const intervalId = setInterval(autoSave, AUTO_SAVE_INTERVAL)

    return () => clearInterval(intervalId)
  }, [autoSaveEnabled, currentSnapshot, editor])

  // Fetch snapshots on component mount
  useEffect(() => {
    handleFetchSnapshots()
  }, [handleFetchSnapshots])

  return (
    <>
      <div className="px-4 py-2 pointer-events-auto flex gap-2 items-center flex-wrap">
        {/* Save button */}
        <button
          onClick={() => setShowSaveModal(true)}
          className="px-4 py-2 bg-green-500 text-white rounded font-medium hover:bg-green-600"
        >
          💾 Save New
        </button>
        
        {/* Load button */}
        <button
          onClick={() => {
            handleFetchSnapshots()
            setShowLoadModal(true)
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded font-medium hover:bg-blue-600"
        >
          📂 Load
        </button>
        
        {/* Current snapshot indicator and controls */}
        {currentSnapshot && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700 bg-gray-100 px-2 py-1 rounded">
              📄 {currentSnapshot.name}
            </span>
            
            {/* Auto-save toggle */}
            <button
              onClick={toggleAutoSave}
              className={`px-3 py-1 rounded text-sm font-medium ${
                autoSaveEnabled 
                  ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
              title={autoSaveEnabled ? 'Auto-save ON - click to disable' : 'Auto-save OFF - click to enable'}
            >
              {autoSaveEnabled ? '🔄 Auto' : '⏸️ Auto'}
            </button>
            
            {/* Manual update button - only shown when auto-save is OFF */}
            {!autoSaveEnabled && (
              <button
                onClick={handleManualUpdate}
                disabled={isSaving}
                className="px-3 py-1 bg-amber-500 text-white rounded text-sm font-medium hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                title="Update current snapshot"
              >
                {isSaving ? '⏳ Saving...' : '✏️ Update'}
              </button>
            )}
          </div>
        )}
        
        {/* Snapshot count indicator */}
        {snapshots.length > 0 && !currentSnapshot && (
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
