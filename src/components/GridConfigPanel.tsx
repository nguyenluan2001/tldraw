/**
 * Grid Configuration Panel
 * 
 * A UI component that integrates with the default style panel
 * to allow users to configure grid properties:
 * - Number of columns
 * - Number of rows
 * - Style options (color, size, dash)
 * 
 * This panel appears in the style panel when a grid shape is selected,
 * similar to how arrowhead options appear for arrow shapes.
 * 
 * @module components/GridConfigPanel
 */

import React, { useState, useEffect, useRef } from 'react'
import {
    useEditor,
    useValue,
    track,
    DefaultStylePanel,
} from 'tldraw'
import type { GridShape } from '../shapes/GridShape'

// Store default grid settings that persist across the session
let defaultGridColumns = 4
let defaultGridRows = 4

/**
 * Get default columns for new grids
 */
export function getDefaultGridColumns(): number {
    return defaultGridColumns
}

/**
 * Get default rows for new grids
 */
export function getDefaultGridRows(): number {
    return defaultGridRows
}

/**
 * Update default columns
 */
export function setDefaultGridColumns(value: number): void {
    defaultGridColumns = value
}

/**
 * Update default rows
 */
export function setDefaultGridRows(value: number): void {
    defaultGridRows = value
}

/**
 * Grid Style Panel Component
 * 
 * Extends the default style panel with grid-specific controls.
 * Shows when a grid shape is selected or when grid tool is active.
 */
export const GridConfigPanel = track(() => {
    const editor = useEditor()
    const containerRef = useRef<HTMLDivElement>(null)
    
    // Local state for input values (to prevent focus loss on re-render)
    const [localColumns, setLocalColumns] = useState<string>('4')
    const [localRows, setLocalRows] = useState<string>('4')
    
    // Check if grid tool is selected
    const isGridToolSelected = useValue(
        'isGridToolSelected',
        () => editor.getCurrentToolId() === 'grid',
        [editor]
    )
    
    // Get selected grid shape
    const selectedGridShape = useValue(
        'selectedGridShape',
        () => {
            const selectedShapes = editor.getSelectedShapes()
            if (selectedShapes.length === 1 && selectedShapes[0].type === 'grid') {
                return selectedShapes[0] as GridShape
            }
            return null
        },
        [editor]
    )
    
    // Check if we should show the panel - only when grid tool is active or a grid is selected
    const shouldShowGridConfig = isGridToolSelected || !!selectedGridShape
    
    // Get the grid shape to work with
    const gridShape = selectedGridShape
    
    // Sync local state with shape props
    useEffect(() => {
        if (gridShape) {
            setLocalColumns(String(gridShape.props.columns))
            setLocalRows(String(gridShape.props.rows))
        } else {
            setLocalColumns(String(defaultGridColumns))
            setLocalRows(String(defaultGridRows))
        }
    }, [gridShape?.props.columns, gridShape?.props.rows])
    
    /**
     * Handle columns change - update local state immediately
     */
    const handleColumnsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value
        setLocalColumns(newValue)
    }
    
    /**
     * Handle rows change - update local state immediately
     */
    const handleRowsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value
        setLocalRows(newValue)
    }
    
    /**
     * Handle columns blur - commit the change
     */
    const handleColumnsBlur = () => {
        const value = Math.max(1, Math.min(50, parseInt(localColumns) || 1))
        setLocalColumns(String(value))
        
        if (gridShape) {
            editor.updateShape<GridShape>({
                id: gridShape.id,
                type: 'grid',
                props: { columns: value },
            })
        } else {
            defaultGridColumns = value
        }
    }
    
    /**
     * Handle rows blur - commit the change
     */
    const handleRowsBlur = () => {
        const value = Math.max(1, Math.min(50, parseInt(localRows) || 1))
        setLocalRows(String(value))
        
        if (gridShape) {
            editor.updateShape<GridShape>({
                id: gridShape.id,
                type: 'grid',
                props: { rows: value },
            })
        } else {
            defaultGridRows = value
        }
    }
    
    /**
     * Handle key down - commit on Enter
     */
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.currentTarget.blur()
        }
        e.stopPropagation()
    }
    
    return (
        <div className="tl-style-panel">
            {/* Default style panel for color, size, dash */}
            <DefaultStylePanel />
            
            {/* Grid-specific configuration - appears like arrowhead section */}
            {shouldShowGridConfig && (
                <div 
                    ref={containerRef}
                    className="tl-grid-config-section"
                    onPointerDown={(e) => {
                        if (!(e.target instanceof HTMLInputElement)) {
                            e.stopPropagation()
                        }
                    }}
                    onMouseDown={(e) => {
                        if (!(e.target instanceof HTMLInputElement)) {
                            e.stopPropagation()
                        }
                    }}
                    onClick={(e) => {
                        if (!(e.target instanceof HTMLInputElement)) {
                            e.stopPropagation()
                        }
                    }}
                >
                    <div className="tl-grid-config-section__title">
                        Grid Size
                    </div>
                    <div className="tl-grid-config-section__row">
                        <span className="tl-grid-config-section__label">Columns</span>
                        <input
                            type="number"
                            min={1}
                            max={50}
                            value={localColumns}
                            onChange={handleColumnsChange}
                            onBlur={handleColumnsBlur}
                            onKeyDown={handleKeyDown}
                            className="tl-grid-config-section__input"
                        />
                        <span className="tl-grid-config-section__label">Rows</span>
                        <input
                            type="number"
                            min={1}
                            max={50}
                            value={localRows}
                            onChange={handleRowsChange}
                            onBlur={handleRowsBlur}
                            onKeyDown={handleKeyDown}
                            className="tl-grid-config-section__input"
                        />
                    </div>
                </div>
            )}
        </div>
    )
})
