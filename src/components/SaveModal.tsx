/**
 * Save Modal Component
 * 
 * A modal dialog that allows users to save their current tldraw canvas
 * as a named snapshot. The name is sanitized on the server side for
 * safe filesystem storage.
 * 
 * Uses React Portal to render outside tldraw's container to avoid
 * z-index and pointer-event conflicts.
 * 
 * @module components/SaveModal
 */

import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { SaveModalProps } from '../types'

/**
 * Modal component for saving snapshots with a custom name
 * 
 * Features:
 * - Text input for snapshot name
 * - Enter key support for quick save
 * - Disabled state when name is empty
 * - Tailwind CSS styling
 * - Rendered via React Portal for proper z-index handling
 * 
 * @param props - Component props (isOpen, onClose, onSave)
 * @returns JSX element or null when closed
 * 
 * @example
 * ```tsx
 * <SaveModal
 *   isOpen={showSaveModal}
 *   onClose={() => setShowSaveModal(false)}
 *   onSave={(name) => handleSave(name)}
 * />
 * ```
 */
function SaveModal({ isOpen, onClose, onSave }: SaveModalProps) {
  /** Local state for the snapshot name input */
  const [name, setName] = useState('')

  // Don't render anything if modal is closed
  if (!isOpen) return null

  /**
   * Handles the save action
   * Validates that name is not empty, then calls onSave callback
   * and resets the input field before closing the modal
   */
  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim())
      setName('')
      onClose()
    }
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
      {/* Modal content container */}
      <div className="bg-white p-6 rounded-lg min-w-[300px] shadow-xl">
        {/* Modal title */}
        <h3 className="text-lg font-semibold mb-4">Save Snapshot</h3>
        
        {/* Name input field */}
        <input
          type="text"
          placeholder="Enter snapshot name..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          className="w-full px-3 py-2 border border-gray-300 rounded mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          autoFocus
        />
        
        {/* Action buttons */}
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-4 py-2 bg-green-500 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-green-600"
          >
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default SaveModal
