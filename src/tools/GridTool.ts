/**
 * Grid Tool
 *
 * A custom tool for creating grid shapes. Click and drag to define
 * the grid area. The tool creates a grid with configurable columns
 * and rows.
 *
 * Features:
 * - Click and drag to define grid bounds
 * - Hold Shift to create a square grid
 * - Configurable columns and rows via shape properties
 *
 * @module tools/GridTool
 */

import {
    StateNode,
    type TLPointerEventInfo,
    type TLShapeId,
    createShapeId,
} from 'tldraw'
import type { GridShape } from '../shapes/GridShape'
import { getDefaultGridColumns, getDefaultGridRows } from '../components/GridConfigPanel'

/**
 * Grid Tool
 * 
 * Main tool class that defines the grid tool with two states:
 * - Idle: Waiting for user to start drawing
 * - Drawing: User is dragging to define grid bounds
 */
export class GridTool extends StateNode {
    static override id = 'grid'
    static override children() {
        return [IdleState, DrawingState]
    }
    static override initial = 'idle'
}

/**
 * Idle State
 * 
 * The initial state when the grid tool is selected.
 * Transitions to drawing state on pointer down.
 */
export class IdleState extends StateNode {
    static override id = 'idle'

    /**
     * Handles pointer down event to start drawing
     * Creates a new grid shape at the click position
     */
    override onPointerDown(info: TLPointerEventInfo) {
        const { editor } = this
        const { x, y } = editor.inputs.currentPagePoint

        // Create shape at the click position
        // Styles (color, size, dash) are automatically applied from editor's stylesForNextShape
        const id = createShapeId('grid')
        editor.createShape<GridShape>({
            id,
            type: 'grid',
            x,
            y,
            props: {
                columns: getDefaultGridColumns(),
                rows: getDefaultGridRows(),
                cellWidth: 0,
                cellHeight: 0,
            },
        })

        this.parent.transition('drawing', { shapeId: id })
    }
}

/**
 * Drawing State
 * 
 * The state when the user is actively drawing a grid.
 * Handles updating the grid size based on pointer movement.
 */
export class DrawingState extends StateNode {
    static override id = 'drawing'

    private shapeId: TLShapeId | null = null
    private startPagePoint: { x: number; y: number } | null = null

    override onEnter(info: { shapeId: TLShapeId }) {
        this.shapeId = info.shapeId
        const { editor } = this
        this.startPagePoint = { ...editor.inputs.currentPagePoint }
    }

    override onPointerMove() {
        if (!this.shapeId || !this.startPagePoint) return

        const { editor } = this
        const shape = editor.getShape<GridShape>(this.shapeId)
        if (!shape) return

        const currentPoint = editor.inputs.currentPagePoint
        
        // Calculate grid dimensions
        let width = Math.abs(currentPoint.x - this.startPagePoint.x)
        let height = Math.abs(currentPoint.y - this.startPagePoint.y)
        
        // Constrain to square if shift is held
        if (editor.inputs.shiftKey) {
            const size = Math.max(width, height)
            width = size
            height = size
        }

        // Update shape position to be at the top-left corner
        const newX = Math.min(this.startPagePoint.x, currentPoint.x)
        const newY = Math.min(this.startPagePoint.y, currentPoint.y)

        // Calculate cell size based on shape's columns/rows
        const columns = shape.props.columns
        const rows = shape.props.rows
        const cellWidth = width / columns
        const cellHeight = height / rows

        editor.updateShape<GridShape>({
            id: this.shapeId,
            type: 'grid',
            x: newX,
            y: newY,
            props: {
                ...shape.props,
                cellWidth: Math.max(10, cellWidth),
                cellHeight: Math.max(10, cellHeight),
            },
        })
    }

    override onPointerUp() {
        this.complete()
    }

    override onCancel() {
        this.complete()
    }

    private complete() {
        const { editor } = this
        
        if (this.shapeId) {
            const shape = editor.getShape<GridShape>(this.shapeId)
            
            // If the grid is too small, delete it
            if (shape && (shape.props.cellWidth < 10 || shape.props.cellHeight < 10)) {
                editor.deleteShape(this.shapeId)
            } else if (shape) {
                // Select the created grid shape
                editor.select(this.shapeId)
            }
        }

        this.shapeId = null
        this.startPagePoint = null
        
        // Switch to select tool after drawing
        editor.setCurrentTool('select')
    }
}
