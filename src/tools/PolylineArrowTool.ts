/**
 * Polyline Arrow Tool
 * 
 * A custom tool for creating polyline arrows. Click to add points,
 * double-click or press Enter to finish the arrow.
 * 
 * Features:
 * - Hold Shift to constrain to horizontal/vertical/45-degree angles
 * - Drag handles to modify points
 * 
 * @module tools/PolylineArrowTool
 */

import {
    StateNode,
    type TLPointerEventInfo,
    type TLShapeId,
    createShapeId,
    Vec,
} from 'tldraw'
import type { PolylineArrowShape } from '../shapes/PolylineArrowShape'

/**
 * Polyline Arrow Tool
 * 
 * Main tool class that defines the polyline arrow tool with two states:
 * - Idle: Waiting for user to start drawing
 * - Drawing: User is adding points to the arrow
 */
export class PolylineArrowTool extends StateNode {
    static override id = 'polyline-arrow'
    static override children() {
        return [IdleState, DrawingState]
    }
    static override initial = 'idle'
}

/**
 * Constrains a point to horizontal, vertical, or 45-degree angles
 * relative to a reference point when shift is held
 */
function constrainPoint(point: { x: number; y: number }, reference: { x: number; y: number }): { x: number; y: number } {
    const dx = point.x - reference.x
    const dy = point.y - reference.y
    
    const angle = Math.atan2(dy, dx)
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    // Snap to nearest 45-degree increment
    const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4)
    
    return {
        x: reference.x + distance * Math.cos(snappedAngle),
        y: reference.y + distance * Math.sin(snappedAngle),
    }
}

/**
 * Idle State
 * 
 * The initial state when the polyline arrow tool is selected.
 * Transitions to drawing state on pointer down.
 */
export class IdleState extends StateNode {
    static override id = 'idle'

    /**
     * Handles pointer down event to start drawing
     * Creates a new polyline arrow shape with the initial point
     */
    override onPointerDown(info: TLPointerEventInfo) {
        const { editor } = this
        const { x, y } = editor.inputs.currentPagePoint

        // Create shape at the click position
        // Styles (color, size, dash) are automatically applied from editor's stylesForNextShape
        const id = createShapeId('polyline-arrow')
        editor.createShape<PolylineArrowShape>({
            id,
            type: 'polyline-arrow',
            x,
            y,
            props: {
                points: [{ x: 0, y: 0 }, { x: 0, y: 0 }], // start + preview (relative to shape position)
            },
        })

        this.parent.transition('drawing', { shapeId: id })
    }
}

/**
 * Drawing State
 * 
 * The state when the user is actively drawing a polyline arrow.
 * Handles adding points, previewing, and completing the arrow.
 */
export class DrawingState extends StateNode {
    static override id = 'drawing'

    shapeId: TLShapeId | null = null

    override onEnter(info: { shapeId: TLShapeId }) {
        this.shapeId = info.shapeId
    }

    /**
     * Handles pointer down to add a new point
     */
    override onPointerDown(info: TLPointerEventInfo) {
        if (!this.shapeId) return

        const shape = this.editor.getShape(this.shapeId) as PolylineArrowShape | null
        if (!shape) return

        const { x: shapeX, y: shapeY } = shape
        const { x: pageX, y: pageY } = this.editor.inputs.currentPagePoint
        
        // Convert page coordinates to shape-relative coordinates
        let relX = pageX - shapeX
        let relY = pageY - shapeY
        
        // If shift is held, constrain to horizontal/vertical/45-degree angles
        if (this.editor.inputs.shiftKey) {
            const pts = shape.props.points
            const prevPoint = pts[pts.length - 2] // Get the second-to-last point
            if (prevPoint) {
                const constrained = constrainPoint({ x: relX, y: relY }, prevPoint)
                relX = constrained.x
                relY = constrained.y
            }
        }
        
        const point = { x: relX, y: relY }
        const pts = shape.props.points

        this.editor.updateShape({
            id: this.shapeId,
            type: 'polyline-arrow',
            props: {
                points: [...pts.slice(0, -1), point, { ...point }],
            },
        })
    }

    /**
     * Handles pointer move to preview the next segment
     */
    override onPointerMove() {
        if (!this.shapeId) return

        const shape = this.editor.getShape(this.shapeId) as PolylineArrowShape | null
        if (!shape) return

        const { x: shapeX, y: shapeY } = shape
        const { x: pageX, y: pageY } = this.editor.inputs.currentPagePoint
        
        // Convert page coordinates to shape-relative coordinates
        let relX = pageX - shapeX
        let relY = pageY - shapeY
        
        // If shift is held, constrain to horizontal/vertical/45-degree angles
        if (this.editor.inputs.shiftKey) {
            const pts = shape.props.points
            const prevPoint = pts[pts.length - 2] // Get the second-to-last point
            if (prevPoint) {
                const constrained = constrainPoint({ x: relX, y: relY }, prevPoint)
                relX = constrained.x
                relY = constrained.y
            }
        }
        
        const point = { x: relX, y: relY }
        const pts = shape.props.points

        this.editor.updateShape({
            id: this.shapeId,
            type: 'polyline-arrow',
            props: {
                points: [...pts.slice(0, -1), point],
            },
        })
    }

    /**
     * Handles double click to complete the arrow
     */
    override onDoubleClick() {
        this.complete()
    }

    /**
     * Handles keyboard events
     * Enter: Complete the arrow
     * Escape: Cancel the arrow
     */
    override onKeyDown(info: { key: string }) {
        if (info.key === 'Enter') {
            this.complete()
        } else if (info.key === 'Escape') {
            this.cancel()
        }
    }

    /**
     * Completes the arrow and returns to select tool
     */
    complete() {
        if (this.shapeId) {
            const shape = this.editor.getShape(this.shapeId) as PolylineArrowShape | null
            if (shape) {
                const pts = shape.props.points
                // Remove the last preview point if there are more than 2 points
                if (pts.length > 2) {
                    this.editor.updateShape({
                        id: this.shapeId,
                        type: 'polyline-arrow',
                        props: {
                            points: pts.slice(0, -1),
                        },
                    })
                }
            }
        }
        this.shapeId = null
        this.editor.setCurrentTool('select')
    }

    /**
     * Cancels the arrow and deletes the shape
     */
    cancel() {
        if (this.shapeId) {
            this.editor.deleteShape(this.shapeId)
        }
        this.shapeId = null
        this.editor.setCurrentTool('select')
    }
}
