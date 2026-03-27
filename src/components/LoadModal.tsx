/**
 * Load Modal Component
 * 
 * A modal dialog that displays all saved snapshots and allows users
 * to load or delete them. Shows snapshot metadata including name,
 * creation date, and file size.
 * 
 * Uses React Portal to render outside tldraw's container to avoid
 * z-index and pointer-event conflicts.
 * 
 * @module components/LoadModal
 */

import { createPortal } from 'react-dom'
import type { LoadModalProps } from '../types'

/**
 * Modal component for loading and managing saved snapshots
 * 
 * Features:
 * - Displays list of saved snapshots with metadata
 * - Load button to restore a snapshot
 * - Delete button to remove unwanted snapshots
 * - Loading state while fetching snapshots
 * - Empty state when no snapshots exist
 * - Tailwind CSS styling
 * - Rendered via React Portal for proper z-index handling
 * 
 * @param props - Component props (isOpen, onClose, snapshots, onLoad, onDelete, loading)
 * @returns JSX element or null when closed
 * 
 * @example
 * ```tsx
 * <LoadModal
 *   isOpen={showLoadModal}
 *   onClose={() => setShowLoadModal(false)}
 *   snapshots={snapshotList}
 *   onLoad={(filename) => handleLoad(filename)}
 *   onDelete={(filename) => handleDelete(filename)}
 *   loading={isLoading}
 * />
 * ```
 */
function LoadModal({ isOpen, onClose, snapshots, onLoad, onDelete, loading }: LoadModalProps) {
  // Don't render anything if modal is closed
  if (!isOpen) return null

  /**
   * Formats a date string to a localized format
   * @param dateString - ISO date string
   * @returns Formatted date string
   */
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString()
  }

  /**
   * Formats file size in bytes to a human-readable KB format
   * @param bytes - File size in bytes
   * @returns Formatted size string in KB
   */
  const formatSize = (bytes: number): string => {
    return (bytes / 1024).toFixed(1)
  }

  /**
   * Handles clicking on the backdrop to close the modal
   */
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  // Use portal to render modal at document body level
  return createPortal(
    /** Modal backdrop with semi-transparent overlay */
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center"
      style={{ zIndex: 9999 }}
      onClick={handleBackdropClick}
    >
      {/* Modal content container with max height for scrolling */}
      <div className="bg-white p-6 rounded-lg min-w-[400px] max-h-[80vh] flex flex-col shadow-xl">
        {/* Modal title */}
        <h3 className="text-lg font-semibold mb-4">Load Snapshot</h3>
        
        {/* Snapshots list container with scroll */}
        <div className="flex-1 overflow-y-auto mb-4 border border-gray-200 rounded">
          {loading ? (
            /** Loading state */
            <div className="p-5 text-center text-gray-500">Loading...</div>
          ) : snapshots.length === 0 ? (
            /** Empty state */
            <div className="p-5 text-center text-gray-500">No snapshots saved yet</div>
          ) : (
            /** Snapshots list */
            snapshots.map((snapshot) => (
              <div
                key={snapshot.filename}
                className="p-3 border-b border-gray-100 last:border-b-0 flex items-center justify-between"
              >
                {/* Snapshot info section */}
                <div>
                  <div className="font-medium">{snapshot.name}</div>
                  <div className="text-xs text-gray-500">
                    {formatDate(snapshot.createdAt)} • {formatSize(snapshot.size)} KB
                  </div>
                </div>
                
                {/* Action buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      onLoad(snapshot.filename)
                      onClose()
                    }}
                    className="px-3 py-1.5 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                  >
                    Load
                  </button>
                  <button
                    onClick={() => onDelete(snapshot.filename)}
                    className="px-3 py-1.5 border border-red-500 text-red-500 rounded text-sm hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Close button */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default LoadModal
