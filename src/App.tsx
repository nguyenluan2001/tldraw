/**
 * Main Application Component
 * 
 * This is the root component of the tldraw snapshot application.
 * It sets up the tldraw editor with:
 * - Custom snapshot manager for full CRUD operations
 * - Custom Lasso select tool visible in the toolbar
 * - All default tldraw drawing tools
 * 
 * @module App
 */

import {
    DefaultKeyboardShortcutsDialog,
    DefaultKeyboardShortcutsDialogContent,
    DefaultToolbar,
    DefaultToolbarContent,
    Tldraw,
    TldrawUiMenuItem,
    useTools,
    useIsToolSelected,
    type TLUiOverrides,
    type TLComponents,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { SnapshotManager } from './components'
import { LassoSelectTool } from './tools/LassoSelectTool'
import { LassoOverlays } from './components/LassoSelectOverlay'

/**
 * UI Overrides for the lasso select tool
 * 
 * Adds the lasso select tool to the toolbar with:
 * - Custom icon (color icon as placeholder)
 * - Label: "Lasso Select"
 * - Keyboard shortcut: 'w'
 */
const uiOverrides: TLUiOverrides = {
    tools(editor, tools) {
        tools['lasso-select'] = {
            id: 'lasso-select',
            icon: 'color',
            label: 'Lasso Select',
            kbd: 'w',
            onSelect: () => {
                editor.setCurrentTool('lasso-select')
            },
        }
        return tools
    },
}

/**
 * Custom components configuration
 * 
 * - Toolbar: Adds lasso select button before default tools
 * - KeyboardShortcutsDialog: Adds lasso select shortcut info
 * - Overlays: Renders the lasso selection visual
 * - SharePanel: Snapshot manager with full CRUD
 */
const components: TLComponents = {
    Toolbar: (props) => {
        const tools = useTools()
        const isLassoSelected = useIsToolSelected(tools['lasso-select'])
        return (
            <DefaultToolbar {...props}>
                <TldrawUiMenuItem {...tools['lasso-select']} isSelected={isLassoSelected} />
                <DefaultToolbarContent />
            </DefaultToolbar>
        )
    },
    KeyboardShortcutsDialog: (props) => {
        const tools = useTools()
        return (
            <DefaultKeyboardShortcutsDialog {...props}>
                <DefaultKeyboardShortcutsDialogContent />
                <TldrawUiMenuItem {...tools['lasso-select']} />
            </DefaultKeyboardShortcutsDialog>
        )
    },
    Overlays: () => (
        <>
            <LassoOverlays />
        </>
    ),
    SharePanel: SnapshotManager,
}

/**
 * Main Application Component
 * 
 * Renders a full-screen tldraw editor with:
 * - Snapshot manager with full CRUD operations (Create, Read, Update, Delete)
 * - Lasso select tool visible directly in the toolbar
 * - All default tldraw drawing tools
 * 
 * The lasso select tool allows users to draw a freeform shape
 * to select multiple shapes at once. Shapes must be fully contained
 * within the lasso to be selected.
 * 
 * @returns JSX element containing the tldraw editor
 */
export default function App() {
    return (
        /** Full-screen container for the tldraw editor */
        <div className="fixed inset-0">
            <Tldraw
                tools={[LassoSelectTool]}
                overrides={uiOverrides}
                components={components}
                persistenceKey="tldraw-snapshots"
            />
        </div>
    )
}
