/**
 * Notification Component
 * 
 * A toast-style notification component that displays feedback messages
 * to the user. Supports success and error states with appropriate styling.
 * 
 * Uses React Portal to render outside tldraw's container to avoid
 * z-index conflicts.
 * 
 * @module components/Notification
 */

import { createPortal } from 'react-dom'
import type { NotificationState } from '../types'

/**
 * Props for the Notification component
 * 
 * @property notification - Current notification state (null when hidden)
 */
interface NotificationProps {
  notification: NotificationState | null
}

/**
 * Toast notification component for user feedback
 * 
 * Features:
 * - Success (green) and error (red) visual states
 * - Fixed positioning at bottom center
 * - Fade-in animation via CSS
 * - Auto-dismissed by parent component
 * - Rendered via React Portal for proper z-index handling
 * 
 * @param props - Component props containing notification state
 * @returns JSX element or null when no notification
 * 
 * @example
 * ```tsx
 * <Notification notification={{ message: 'Saved!', type: 'success' }} />
 * ```
 */
function Notification({ notification }: NotificationProps) {
  // Don't render anything if no notification
  if (!notification) return null

  // Use portal to render notification at document body level
  return createPortal(
    <div
      className={`fixed bottom-5 left-1/2 -translate-x-1/2 px-6 py-3 rounded text-white shadow-lg ${
        notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
      }`}
      style={{ zIndex: 9999 }}
    >
      {notification.message}
    </div>,
    document.body
  )
}

export default Notification
