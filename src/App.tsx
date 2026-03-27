/**
 * Main Application Component
 * 
 * This is the root component of the tldraw snapshot application.
 * It sets up the tldraw editor with a custom toolbar for saving
 * and loading snapshots.
 * 
 * @module App
 */

import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { SnapshotToolbar } from './components'

/**
 * Main Application Component
 * 
 * Renders a full-screen tldraw editor with a custom snapshot toolbar.
 * The toolbar allows users to:
 * - Save their current canvas as a named snapshot
 * - Load previously saved snapshots
 * - Delete unwanted snapshots
 * 
 * @returns JSX element containing the tldraw editor
 * 
 * @example
 * ```tsx
 * // In main.tsx
 * createRoot(document.getElementById('root')!).render(
 *   <StrictMode>
 *     <App />
 *   </StrictMode>,
 * )
 * ```
 */
export default function App() {
  return (
    /** Full-screen container for the tldraw editor */
    <div className="fixed inset-0">
      <Tldraw
        components={{
          /** Custom toolbar component for snapshot operations */
          SharePanel: SnapshotToolbar,
        }}
      />
    </div>
  )
}
