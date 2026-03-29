/**
 * Main Application Component
 *
 * This is the root component of the tldraw snapshot application.
 * It sets up the tldraw editor with:
 * - Custom snapshot manager for full CRUD operations
 * - Custom Lasso select tool visible in the toolbar
 * - Custom Polyline Arrow tool for drawing multi-segment arrows
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
import { LassoIcon, GridFourIcon } from '@phosphor-icons/react'
import { SnapshotManager } from './components'
import { LassoSelectTool } from './tools/LassoSelectTool'
import { PolylineArrowTool } from './tools/PolylineArrowTool'
import { GridTool } from './tools/GridTool'
import { PolylineArrowUtil } from './shapes/PolylineArrowShape'
import { GridUtil } from './shapes/GridShape'
import { LassoOverlays } from './components/LassoSelectOverlay'
import { GridConfigPanel } from './components/GridConfigPanel'

/**
 * UI Overrides for custom tools
 *
 * Adds the lasso select tool and polyline arrow tool to the toolbar with:
 * - Lasso Select: Blob icon (freeform shape), label: "Lasso Select", shortcut: 'w'
 * - Polyline Arrow: Elbow arrow icon, label: "Polyline Arrow", shortcut: 'p'
 */
const uiOverrides: TLUiOverrides = {
    tools(editor, tools) {
        tools['lasso-select'] = {
            id: 'lasso-select',
            icon: 'blob',
            label: 'Lasso Select',
            kbd: 'w',
            onSelect: () => {
                editor.setCurrentTool('lasso-select')
            },
        }
        tools['polyline-arrow'] = {
            id: 'polyline-arrow',
            icon: 'arrow-elbow',
            label: 'Polyline Arrow',
            kbd: 'p',
            onSelect: () => {
                editor.setCurrentTool('polyline-arrow')
            },
        }
        tools['grid'] = {
            id: 'grid',
            icon: 'grid',
            label: 'Grid',
            kbd: 'g',
            onSelect: () => {
                editor.setCurrentTool('grid')
            },
        }
        return tools
    },
}

/**
 * Custom components configuration
 *
 * - Toolbar: Adds lasso select and polyline arrow buttons before default tools
 * - KeyboardShortcutsDialog: Adds custom tool shortcut info
 * - Overlays: Renders the lasso selection visual
 * - SharePanel: Snapshot manager with full CRUD
 */
const components: TLComponents = {
    Toolbar: (props) => {
        const tools = useTools()
        const isLassoSelected = useIsToolSelected(tools['lasso-select'])
        const isPolylineArrowSelected = useIsToolSelected(tools['polyline-arrow'])
        const isGridSelected = useIsToolSelected(tools['grid'])
        return (
            <DefaultToolbar {...props}>
                <button
                    className={`tl-toolbar-button ${isLassoSelected ? 'tl-toolbar-button--selected' : ''}`}
                    onClick={() => tools['lasso-select'].onSelect('toolbar')}
                    title={`${tools['lasso-select'].label} (${tools['lasso-select'].kbd})`}
                >
                    <LassoIcon size={18} color={isLassoSelected ? '#fcfcfc' : undefined} />
                </button>
                <TldrawUiMenuItem {...tools['polyline-arrow']} isSelected={isPolylineArrowSelected} />
                <button
                    className={`tl-toolbar-button ${isGridSelected ? 'tl-toolbar-button--selected' : ''}`}
                    onClick={() => tools['grid'].onSelect('toolbar')}
                    title={`${tools['grid'].label} (${tools['grid'].kbd})`}
                >
                    <GridFourIcon size={18} color={isGridSelected ? '#fcfcfc' : undefined} />
                </button>
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
                <TldrawUiMenuItem {...tools['polyline-arrow']} />
                <TldrawUiMenuItem {...tools['grid']} />
            </DefaultKeyboardShortcutsDialog>
        )
    },
    Overlays: () => (
        <>
            <LassoOverlays />
        </>
    ),
    StylePanel: GridConfigPanel,
    SharePanel: SnapshotManager,
}

/**
 * Main Application Component
 *
 * Renders a full-screen tldraw editor with:
 * - Snapshot manager with full CRUD operations (Create, Read, Update, Delete)
 * - Lasso select tool visible directly in the toolbar
 * - Polyline arrow tool for drawing multi-segment arrows
 * - All default tldraw drawing tools
 *
 * The lasso select tool allows users to draw a freeform shape
 * to select multiple shapes at once. Shapes must be fully contained
 * within the lasso to be selected.
 *
 * The polyline arrow tool allows users to draw arrows with multiple
 * segments by clicking to add points. Double-click or press Enter to finish.
 *
 * @returns JSX element containing the tldraw editor
 */
export default function App() {
    return (
        /** Full-screen container for the tldraw editor */
        <div className="fixed inset-0">
            <Tldraw
                shapeUtils={[PolylineArrowUtil, GridUtil]}
                tools={[LassoSelectTool, PolylineArrowTool, GridTool]}
                overrides={uiOverrides}
                components={components}
                persistenceKey="tldraw-snapshots"
            />
        </div>
    )
}
